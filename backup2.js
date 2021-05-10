import { withPluginApi } from "discourse/lib/plugin-api";
import RawHandlebars from "discourse-common/lib/raw-handlebars";
import { htmlSafe } from "@ember/template";
import { iconHTML, iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import {
  default as Widget,
  createWidget,
  createWidgetFrom,
  applyDecorators,
  queryRegistry
} from "discourse/widgets/widget";
import Component from "@ember/component";
import { observes, on, afterRender } from "discourse-common/utils/decorators";
import { schedule, scheduleOnce } from "@ember/runloop";

const icon = iconHTML("far-circle", { class: "tippy" });
const jsIcon = type => {
  return type === "node"
    ? iconNode("fab-js", { class: "tm-js-icon" })
    : iconHTML("fab-js", { class: "tm-js-icon" });
};

const cssIcon = type => {
  return type === "node"
    ? iconNode("fab-css", { class: "tm-css-icon" })
    : iconHTML("fab-css", { class: "tm-css-icon" });
};

const getTooltipOptions = element => {
  const parent = element.parentNode;
  const rootElem = parent.parentNode;

  return {
    maxWidth: 600,
    //content: parent.firstElementChild.innerHTML,
    content: document.querySelector(".tm-tooltipz"),
    interactive: true,
    allowHTML: true,
    appendTo: () => document.body,
    interactiveBorder: 5,
    onShow() {
      rootElem.classList.add("hover-boi");
    },
    onHide() {
      rootElem.classList.remove("hover-boi");
    }
  };
};

const githubLinkTarget = "_blank";

const widgetIgnoreList = [
  "button",
  "link",
  "flat-button",
  "timeline-scoller",
  "timeline-scollarea",
  "timeline-scroller",
  "timeline-padding",
  "header-dropdown",
  "user-dropdown",
  "header-contents",
  "header-notifications",
  "avatar-flair"
];

const componentIgnoreList = [
  "component:d-button",
  "component:link-to",
  "component:conditional-loading-section",
  "component:plugin-outlet",
  "component:conditional-loading-spinner",
  "component:d-section",
  "component:load-more",
  "component:nav-item",
  "component:navigation-item"
];

const tmTypes = {
  widget: "Widget",
  widget_decorator: "Widget Decorator",
  component: "Component",
  plugin_outlet: "Plugin-outlet",
  raw_plugin_outlet: "Raw Plugin-outlet"
};

const tmDescribtions = {
  widget:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
  widget_decorator:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
  component:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
  plugin_outlet:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
  raw_plugin_outlet:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt"
};

const getURL = (type, term) => {
  const baseUrl =
    "https://github.com/discourse/discourse/search?q=path:app/assets/";

  const urls = {
    widget: `javascripts+%22${term}%22`,
    component_js: `javascripts+filename:%22${term}%22`,
    component_css: `stylesheets+${term}`,
    outlet: `+%22name=${term}%22`
  };

  return baseUrl + urls[type];
};

const widgetTooltip = widget => {
  return h("span.tm-widget.tm-tooltip", [
    h("span.hidden.tm-content", [
      h("span.tm-type", tmTypes.widget),
      h("div.tm-name", widget.name),
      h("span.tm-describtion", tmDescribtions.widget),
      h(
        "div.tm-meta-info",
        h(
          "a",
          {
            attributes: {
              href: getURL("widget", widget.name),
              target: githubLinkTarget
            }
          },
          jsIcon("node")
        )
      )
    ]),
    iconNode("far-circle", { class: "tippy" })
  ]);
};

const decoratorTooltip = (widget, position) => {
  return h("span.tm-decorator.tm-tooltip", [
    h("span.hidden.tm-content", [
      h("span.tm-type", tmTypes.widget_decorator),
      h("div.tm-name", `${widget.name}:${position}`),
      h("span.tm-describtion", tmDescribtions.widget_decorator),
      h(
        "div.tm-meta-info",
        h(
          "a",
          {
            attributes: {
              href: getURL("widget", widget.name),
              target: githubLinkTarget
            }
          },
          jsIcon("node")
        )
      )
    ]),
    iconNode("far-circle", { class: "tippy" })
  ]);
};

// this needs to pass classname bindings to cath all the css
const componentTooltip = componentName => {
  const simpleName = componentName.split(":")[1];

  const tooltip = document.createElement("span");
  tooltip.classList.add("tm-component", "tm-tooltip");

  tooltip.innerHTML = `
<span class="hidden tm-content">
  <span class="tm-type">${tmTypes.component}</span>
  <div class="tm-name">${simpleName}</div>
  <span class="tm-describtion">${tmDescribtions.component}</span>
  <div class="tm-tm-meta-info">
  <a href="${getURL(`component_js`, simpleName)}" target="${githubLinkTarget}">
    ${jsIcon("html")}
  </a>
  <a href="${getURL(`component_css`, simpleName)}" target="${githubLinkTarget}">
    ${icon}
  </a>
  </div>

</span>
${icon}
`;

  return tooltip;
};

const pluginOutletToolTip = outletName => {
  const tooltip = document.createElement("span");
  tooltip.classList.add("tm-plugin-outlet", "tm-tooltip");

  tooltip.innerHTML = `
<span class="hidden tm-content">
  <span class="tm-type">${tmTypes.plugin_outlet}</span>
  <div class="tm-name">${outletName}</div>
  <span class="tm-describtion">${tmDescribtions.plugin_outlet}</span>
  <div class="tm-tm-meta-info">
  <a href="${getURL(`outlet`, outletName)}" target="${githubLinkTarget}">
    ${jsIcon("html")}
  </a>
  </div>

</span>
${icon}
`;

  return tooltip;
};

// parent template + parent js + ?? parent css
const rawPluginOutletTooltip = outletName => {
  const tooltip = `<div class="tm-raw-plugin-outlet tm-tooltip">
  <span class="hidden tm-content">
    <span class="tm-type">${tmTypes.raw_plugin_outlet}</span>
    <div class="tm-name">${outletName}</div>
    <span class="tm-describtion"
      >${tmDescribtions.raw_plugin_outlet}</span
    >
    <a href="${getURL(`outlet`, outletName)}" target="${githubLinkTarget}">
      ${jsIcon("html")}
    </a>
  </span>
  ${icon}
</div>
`;

  return tooltip;
};

// background doesn't cover select-kits...z-index... psudo-element?

// to avoid the hbr ovverides, maybe try a function that returns the tootip based
// on element classes on hover

// a seprate CSS icons should be possible then

export default {
  name: "dev-panel",
  initialize() {
    withPluginApi("0.8", api => {
      const tooltipIcon = (name, type) => {
        if (type === "widget") {
          const icon = iconNode("far-circle", { class: "ignore" });
          return h(
            "span.tm-tooltip-trigger",
            {
              attributes: {
                "data-name": name,
                "data-type": type
              }
            },
            icon
          );
        } else {
          const thing = document.createElement("span");
          thing.classList.add("tm-tooltip-trigger");
          thing.dataset.name = name;
          thing.dataset.type = type;
          thing.innerHTML = iconHTML("far-circle", { class: "ignore" });

          return thing;
        }
      };

      // Components
      const oldDidInsert = Component.prototype.didInsertElement;

      Component.prototype.didInsertElement = function() {
        const originalResult = oldDidInsert.apply(this, arguments);
        const componentName = this.get("_debugContainerKey");

        if (componentIgnoreList.includes(componentName)) return;

        if (this.element && this.element.firstElementChild) {
          this.element.prepend(componentTooltip(componentName));
        }
      };

      // Raw plugin-outlets
      const oldRawHelper = RawHandlebars.helpers["raw-plugin-outlet"];

      RawHandlebars.helpers["raw-plugin-outlet"] = function(args) {
        const oldRawHelperResult = oldRawHelper.apply(this, arguments);
        const tooltip = rawPluginOutletTooltip(args.hash.name);

        return oldRawHelperResult
          ? htmlSafe(oldRawHelperResult + tooltip)
          : htmlSafe(tooltip);
      };

      // Widgets
      const oldDrawMethod = Widget.prototype.draw;

      Widget.prototype.draw = function() {
        const oldMethodResult = oldDrawMethod.apply(this, arguments);

        if (widgetIgnoreList.includes(this.name)) return oldMethodResult;

        const widget = this;

        const newStuff = widgetTooltip(widget);
        const before = decoratorTooltip(widget, "before");
        const after = decoratorTooltip(widget, "after");

        const children = [...oldMethodResult.children];
        children.unshift(before, newStuff);
        children.push(after);

        oldMethodResult.children = children;

        return oldMethodResult;
      };

      // Plugin-outlets
      api.modifyClass("component:plugin-outlet", {
        @on("init")
        @afterRender
        addTooltip() {
          this.element.prepend(tooltipIcon(this.name, "plugin_outlet"));
          //this.element.prepend(pluginOutletToolTip(this.name));
        }
      });

      window.addEventListener("mouseover", event => {
        //if (!event.target.classList.contains("tm-tooltip-trigger")) return;
        if (!event.target.classList.contains("tippy")) return;

        const marker = event.target;

        if (!marker || !marker.dataset) return;

        const parent = marker.parentNode;
        const rootElem = marker.parentNode;

        const name = marker.dataset.name;
        const type = marker.dataset.type;

        const contentTm = `
        <span class="tm-tooltipz">
          <span class="tm-content">
            <span class="tm-type">${tmTypes[type]}</span>
            <div class="tm-name">${name}</div>
            <span class="tm-describtion">${tmDescribtions[type]}</span>
            <div class="tm-tm-meta-info">
            <a href="${getURL(`outlet`, name)}" target="_blank">
              ${jsIcon("html")}
            </a>
            </div>
          </span>
        </span>`;

        // create a tooltip at the bottom and update the values in it then load that as the content
        // add data values to tooltip icon
        tippy(event.target, {
          maxWidth: 600,
          //content: parent.firstElementChild.innerHTML,
          content: contentTm,
          interactive: true,
          allowHTML: true,
          appendTo: () => document.body,
          interactiveBorder: 5,
          onShow() {
            rootElem.classList.add("hover-boi");
          },
          onHide() {
            rootElem.classList.remove("hover-boi");
          }
        });
      });
    });
  }
};

// Do something with the API here
/*



schedule("afterRender", () => {
  const tooltip = document.createElement("span");
  tooltip.classList.add("tm-tooltipz");

  const contentWrapper = document.createElement("span");
  contentWrapper.classList.add("hidden");
  tooltip.classList.add("tm-content");

  const typeWraper = document.createElement("span");
  typeWraper.classList.add("tm-type");

  const nameWraper = document.createElement("div");
  nameWraper.classList.add("tm-name");

  const describtionWrapper = document.createElement("span");
  describtionWrapper.classList.add("tm-describtion");

  const jsLink = document.createElement("a");
  jsLink.target = "_blank";

  const jsIcon = icon;
  jsLink.append(jsIcon);

  contentWrapper.append(
    typeWraper,
    nameWraper,
    describtionWrapper,
    jsLink
  );

  tooltip.append(contentWrapper);

  document.body.append(tooltip);

  console.log(tooltip);

  const tooltipz = document.querySelector(".tm-tooltipz");
  const tmName = tooltipz.querySelector(".tm-name");
  const tmType = tooltipz.querySelector(".tm-type");
  const tmDescribtion = tooltipz.querySelector(".tm-describtion");
  const tmJsLink = tooltipz.querySelector(".tm-js-link");

  // Main event listner
});

//////


base tooltip






////




const generateTooltip = (name, type, position) => {
  let baseName = name;
  if (type === "widget_decorator" && postion) {
    baseName = `${name}:${postion}`;
  }

  const tooltip = `
<span class="tm-${type} tm-tooltip">
  <span class="tm-content">
    <span class="tm-type">${types[type]}</span>
    <div class="tm-name">${baseName}</div>
    <span class="tm-describtion">${describtions[type]}</span>
    <a href="${getURL(type, name)}" target="${githubLinkTarget}">
      ${githubIcon}
    </a>
  </span>
  ${icons.type}
</span>
`;

  return type === "widget" ? new RawHtml(tooltip) : tooltip;
};



///


////////////

const tooltip = document.createElement("span");
tooltip.classList.add("tm-component");
tooltip.classList.add("tm-tooltip");

const content = document.createElement("span");
content.classList.add("hidden");
tooltip.classList.add("tm-content");

const type = document.createElement("span");
content.classList.add("tm-type");
content.innerText = types.component;

const name = document.createElement("div");
name.classList.add("tm-name");
name.innerText = types.component;

const describtion = document.createElement("span");
describtion.classList.add("tm-describtion");
describtion.innerText = describtions.component;

const githubLink = document.createElement("a");
githubLink.href = getURL(`component`, simpleName);
githubLink.target = "_blank";

const githubIcon = iconHTML("heart");
githubLink.append(githubIcon);

content.append(type, name, describtion, githubLink);

const tooltipIcon = icon;

tooltip.append(content, icon);

return tooltip;

/////

///

api.onPageChange((url, title) => {
  schedule("afterRender", () => {
    $(".theme-tooltip").hover(
      function() {
        $(this)
          .parent()
          .addClass("hover-boi");
      },
      function() {
        $(this)
          .parent()
          .removeClass("hover-boi");
      }
    );
  });
});

// this works for widgets

const oldDraw = Widget.prototype.draw;

Widget.prototype.draw = function() {
  var originalResult = oldDraw.apply(this, arguments);

  if (originalResult.children.length) {
    console.log(this.name);
    Object.assign(originalResult.children, {
      [originalResult.children.length++]: h("span.thing", [
        h(
          "span.scope-tooltip",
          { attributes: { "data-tooltip": this.name } },
          iconNode("trash-alt")
        )
      ])
    });
  }

  console.log(this);

  return originalResult;
};


createWidget = function() {
  var originalResult = oldDraw.apply(oldDraw, arguments);
  return originalResult + h("div", this.name);
};

const Widget = require("discourse/widgets/widget").default;
const oldDraw = Widget.prototype.draw;

Widget.prototype.draw = () => {
  console.log(oldDraw);
  var originalResult = oldDraw.apply(oldDraw, arguments);
  return originalResult + h("div", this.name);
};

console.log(api.container);

Widget.prototype.init = function() {
  this.register.lookupFactory(`widget:${name}`)
};


Widget.reopen({
  didRenderWidget() {
    console.log(this);
  }
});


method1(attrs) {
 // do something
},

method2(attrs) {
 // do something else
},

method3(attrs) {
 // do more work
},
If I just add these methods, they won’t be called automatically. So, what do I do in this case? I call them in the init() method like so…

init(attrs) {
  this.method1(attrs);
  this.method2(attrs);
  this.method3(attrs);
}




import { on, afterRender } from "discourse-common/utils/decorators";


console.log(Ember.TEMPLATES["components/plugin-outlet"]);
console.log(Ember.TEMPLATES);
//  Ember.TEMPLATES["components/plugin-outlet"] = Ember.TEMPLATES["unknown"];
console.log(api.container.lookup(`template:dev-plugin-outlet`));



console.log(api.container.lookup(`component:plugin-outlet`));

const old = api.container.lookup(`template:components/plugin-outlet`);

const newt = api.container.lookup(
  `template:components/dev-plugin-outlet`
);

old = newt;

Ember.TEMPLATES["plugin-outlet"];
Ember.TEMPLATES["dev-plugin-outlet"];




api.modifyClass("component:plugin-outlet", {
  @on("init")
  @afterRender
  highlightOutlet() {
    this.tagName = "span";

    console.log(this);

    const newDiv = document.createElement("span");

    const newContent = document.createTextNode(this.name);

    this.element.appendChild(newContent);
  }
});


init() {

// This should be the future default
if (this.noTags) {
  this.set("tagName", "");
  this.set("connectorTagName", "");
}


const name = this.name;
if (name) {
  const args = buildArgsWithDeprecations(
    this.args || {},
    this.deprecatedArgs || {}
  );
  this.set("connectors", renderedConnectorsFor(name, args, this));
}

  this._super(...arguments);
  this.set("tagName", "div.outlet");
  //    console.log(api.container.lookup("router:main"));

  //    console.log(this);
}

*/

/*
RawHandlebars.helpers["raw-plugin-outlet"] = args => {
  const connectors = rawConnectorsFor(args.hash.name);
  const output = connectors.map(c => c.template({ context: this }));

  const tooltip = `<span
  class="scope-tooltip"
  data-tooltip="${args.hash.name}">
  ${icon}
  </span>`;

  return htmlSafe(tooltip + output.join(""));
};





Widget.prototype.draw = function(builder, attrs, state) {
  const properties = {};

  if (this.buildClasses) {
    let classes = this.buildClasses(attrs, state) || [];
    if (!Array.isArray(classes)) {
      classes = [classes];
    }

    const customClasses = applyDecorators(
      this,
      "classNames",
      attrs,
      stateco
    );
    if (customClasses && customClasses.length) {
      classes = classes.concat(customClasses);
    }

    if (classes.length) {
      properties.className = classes.join(" ");
    }
  }
  if (this.buildId) {
    properties.id = this.buildId(attrs);
  }

  if (this.buildAttributes) {
    properties.attributes = this.buildAttributes(attrs);
  }

  if (this.keyUp) {
    properties["widget-key-up"] = new WidgetKeyUpHook(this);
  }

  if (this.keyDown) {
    properties["widget-key-down"] = new WidgetKeyDownHook(this);
  }

  if (this.clickOutside) {
    properties["widget-click-outside"] = new WidgetClickOutsideHook(this);
  }
  if (this.click) {
    properties["widget-click"] = new WidgetClickHook(this);
  }
  if (this.doubleClick) {
    properties["widget-double-click"] = new WidgetDoubleClickHook(this);
  }

  if (this.mouseDownOutside) {
    properties[
      "widget-mouse-down-outside"
    ] = new WidgetMouseDownOutsideHook(this);
  }

  if (this.drag) {
    properties["widget-drag"] = new WidgetDragHook(this);
  }

  if (this.input) {
    properties["widget-input"] = new WidgetInputHook(this);
  }

  if (this.change) {
    properties["widget-change"] = new WidgetChangeHook(this);
  }

  if (this.mouseDown) {
    properties["widget-mouse-down"] = new WidgetMouseDownHook(this);
  }

  if (this.mouseUp) {
    properties["widget-mouse-up"] = new WidgetMouseUpHook(this);
  }

  if (this.mouseMove) {
    properties["widget-mouse-move"] = new WidgetMouseMoveHook(this);
  }

  if (this.mouseOver) {
    properties["widget-mouse-over"] = new WidgetMouseOverHook(this);
  }

  if (this.mouseOut) {
    properties["widget-mouse-out"] = new WidgetMouseOutHook(this);
  }

  if (this.touchStart) {
    properties["widget-touch-start"] = new WidgetTouchStartHook(this);
  }

  if (this.touchEnd) {
    properties["widget-touch-end"] = new WidgetTouchEndHook(this);
  }

  const attributes = properties["attributes"] || {};
  properties.attributes = attributes;

  if (this.title) {
    if (typeof this.title === "function") {
      attributes.title = this.title(attrs, state);
    } else {
      attributes.title = I18n.t(this.title);
    }
  }

  this.transformed = this.transform(this.attrs, this.state);

  let contents = this.html(attrs, state);
  if (this.name) {
    const beforeContents =
      applyDecorators(this, "before", attrs, state) || [];
    const afterContents =
      applyDecorators(this, "after", attrs, state) || [];
    contents = beforeContents
      .concat(contents)
      .concat(afterContents)
      .concat(h("div", "thing"));
  }

  return h(this.tagName || "div", properties, contents);
};
*/
