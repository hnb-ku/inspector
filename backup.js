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

const getTooltipOptions = element => {
  const parent = element.parentNode;
  const rootElem = parent.parentNode;

  return {
    maxWidth: 600,
    content: parent.firstElementChild.innerHTML,
    interactive: true,
    allowHTML: true,
    appendTo: parent,
    onShow(tooltip) {
      rootElem.classList.add("hover-boi");
    },
    onHide(tooltip) {
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

const types = {
  widget: "Widget",
  widget_decorator: "Widget Decorator",
  component: "Component",
  plugin_outlet: "Plugin-outlet",
  raw_plugin_outlet: "Raw Plugin-outlet"
};

const describtions = {
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
    "https://github.com/discourse/discourse/search?q=path:app/assets/javascripts";

  const urls = {
    widget: `+%22${term}%22`,
    component: `+filename:%22${term}%22`,
    outlet: `+%22name=${term}%22`
  };

  return baseUrl + urls[type];
};

const widgetTooltip = widget => {
  return h("span.tm-widget.tm-tooltip", [
    h("span.tm-content", [
      h("span.tm-type", types.widget),
      h("div.tm-name", widget.name),
      h("span.tm-describtion", describtions.widget),
      h(
        "div.meta-info",
        h(
          "a",
          {
            attributes: {
              href: getURL("widget", widget.name),
              target: githubLinkTarget
            }
          },
          iconNode("heart")
        )
      )
    ]),
    iconNode("far-circle", { class: "tippy" })
  ]);
};

const decoratorTooltip = (widget, position) => {
  return h("span.tm-decorator.tm-tooltip", [
    h("span.tm-content", [
      h("span.tm-type", types.widget_decorator),
      h("div.tm-name", `${widget.name}:${position}`),
      h("span.tm-describtion", describtions.widget_decorator),
      h(
        "div.meta-info",
        h(
          "a",
          {
            attributes: {
              href: getURL("widget", widget.name),
              target: githubLinkTarget
            }
          },
          iconNode("heart")
        )
      )
    ]),
    iconNode("far-circle", { class: "tippy" })
  ]);
};

const componentTooltip = componentName => {
  const simpleName = componentName.split(":")[1];

  const tooltip = document.createElement("span");
  tooltip.classList.add("tm-component", "tm-tooltip");

  tooltip.innerHTML = `
<span class="tm-content">
  <span class="tm-type">${types.component}</span>
  <div class="tm-name">${simpleName}</div>
  <span class="tm-describtion">${describtions.component}</span>
  <a href="${getURL(`component`, simpleName)}" target="${githubLinkTarget}">
    ${iconHTML("heart")}
  </a>
</span>
${icon}
`;

  return tooltip;
};

const pluginOutletToolTip = outletName => {
  const tooltip = document.createElement("span");
  tooltip.classList.add("tm-plugin-outlet", "tm-tooltip");

  tooltip.innerHTML = `
<span class="tm-content">
  <span class="tm-type">${types.plugin_outlet}</span>
  <div class="tm-name">${outletName}</div>
  <span class="tm-describtion">${describtions.plugin_outlet}</span>
  <a href="${getURL(`outlet`, outletName)}" target="${githubLinkTarget}">
    ${iconHTML("heart")}
  </a>
</span>
${icon}
`;

  return tooltip;
};

// it's nested `<a>` tags

const rawPluginOutletTooltip = outletName => {
  const tooltip = `<span class="tm-raw-plugin-outlet tm-tooltip">
  <span class="tm-content">
    <span class="tm-type">${types.raw_plugin_outlet}</span>
    <div class="tm-name">${outletName}</div>
    <span class="tm-describtion"
      >${describtions.raw_plugin_outlet}</span
    >
    <a href="${getURL(`outlet`, outletName)}" target="${githubLinkTarget}">
      ${iconHTML("heart")}
    </a>
  </span>
  ${icon}
</span>
`;

  return tooltip;
};

export default {
  name: "dev-panel",
  initialize() {
    withPluginApi("0.8", api => {
      // Components
      const oldDidInsert = Component.prototype.didInsertElement;

      Component.prototype.didInsertElement = function() {
        const originalResult = oldDidInsert.apply(this, arguments);
        const componentName = this.get("_debugContainerKey");

        if (componentIgnoreList.includes(componentName)) {
          return;
        }

        if (this.element && this.element.firstElementChild) {
          this.element.prepend(componentTooltip(componentName));
        }
      };

      // Raw plugin-outlets
      const oldRawHelper = RawHandlebars.helpers["raw-plugin-outlet"];

      RawHandlebars.helpers["raw-plugin-outlet"] = function(args) {
        const oldRawHelperResult = oldRawHelper.apply(this, arguments);
        const tooltip = rawPluginOutletTooltip(args.hash.name);

        console.log(oldRawHelperResult);

        return oldRawHelperResult
          ? htmlSafe(oldRawHelperResult + tooltip)
          : htmlSafe(tooltip);
      };

      // Widgets
      const oldDrawMethod = Widget.prototype.draw;

      Widget.prototype.draw = function() {
        const oldMethodResult = oldDrawMethod.apply(this, arguments);

        if (widgetIgnoreList.includes(this.name)) {
          return oldMethodResult;
        }

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
          this.element.prepend(pluginOutletToolTip(this.name));
        }
      });

      // Main event listner
      window.onmouseover = event => {
        if (!event.target.classList.contains("tippy")) {
          return;
        }

        const element = event.target;

        tippy(element, getTooltipOptions(element));
      };
    });
  }
};





// Do something with the API here
/*


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




/*


https://meta.discourse.org/t/atlas-a-simple-blog-styled-theme-with-an-optional-sidebar/127863/10?u=johani


image hack css

--aspect-ratio: 690/329;
  --o-height: 329px;
  /* --o-width: 690px; */
  /* max-width: 100%; */
  /* width: 100%; */
  max-width: 100%;
  /* max-width: calc(100% * var(--aspect-ratio)) !important; */
  height: calc(var(--o-width) \ var(--aspect-ratio));



  */
