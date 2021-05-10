import RawHandlebars from "discourse-common/lib/raw-handlebars";
import Component from "@ember/component";

import RawHtml from "discourse/widgets/raw-html";
import { default as Widget } from "discourse/widgets/widget";
import { withPluginApi } from "discourse/lib/plugin-api";
import { htmlSafe } from "@ember/template";
import { iconHTML, iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { on, afterRender } from "discourse-common/utils/decorators";
import { schedule, debounce, later, throttle } from "@ember/runloop";
import afterTransition from "discourse/lib/after-transition";
import loadScript from "discourse/lib/load-script";

const icon = iconHTML("far-circle", { class: "ignore" });

const cssIcon = type => {
  return type === "node"
    ? iconNode("fab-css", { class: "tm-css-icon" })
    : iconHTML("fab-css", { class: "tm-css-icon" });
};

import {
  renderedConnectorsFor,
  buildArgsWithDeprecations
} from "discourse/lib/plugin-connectors";
/*
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
*/
const widgetIgnoreList = [
  "button",
  "link",
  "flat-button",
  "timeline-scroller",
  "timeline-padding",
  "header-dropdown",
  "user-dropdown",
  "header-notifications",
  "avatar-flair"
];

const componentIgnoreList = [
  "d-button",
  "link-to",
  "conditional-loading-section",
  "plugin-outlet",
  "conditional-loading-spinner",
  "d-section",
  "load-more",
  "nav-item",
  "navigation-item",
  "route-hunter",
  "plugin-connector"
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
    widget_decorator: `javascripts+%22${term.split(":")[0]}%22`,
    component: `javascripts+filename:%22${term}%22`,
    component_css: `stylesheets+${term}`,
    outlet: `+%22name=${term}%22`
  };

  return baseUrl + urls[type];
};

const getTagName = name => {
  let tagName = "span";

  if (name === "topic-list-item" || name === "topic-list-before-columns") {
    tagName = "td";
  }

  if (
    name === "topic-list-header-before" ||
    name === "topic-list-header-after"
  ) {
    tagName = "th";
  }

  return tagName;
};

export default {
  name: "dev-panel",
  initialize() {
    withPluginApi("0.8", api => {
      const tooltipIcon = (name, type, position) => {
        const className = `tm-${type.replace(/_/g, "-")}`;

        if (type === "widget" || type === "widget_decorator") {
          return h(
            `span.tm-tooltip-trigger.${className}`,
            {
              attributes: {
                "data-name": position ? `${name}:${position}` : name,
                "data-type": type
              }
            },
            iconNode("far-circle", {
              class: "ignore"
            })
          );
        } else {
          const tagName = getTagName(name);
          const thing = document.createElement(tagName);

          thing.classList.add("tm-tooltip-trigger", className);
          thing.dataset.name = name;
          thing.dataset.type = type;
          thing.innerHTML = icon;

          return type === "raw_plugin_outlet" ? thing.outerHTML : thing;
        }
      };

      // Components
      // this needs to pass classname bindings to cath all the css
      const oldDidInsert = Component.prototype.didInsertElement;

      Component.prototype.didInsertElement = function() {
        const originalResult = oldDidInsert.apply(this, arguments);
        const componentName = this.get("_debugContainerKey").split(":")[1];

        if (componentIgnoreList.includes(componentName)) return;

        if (this.element && this.element.firstElementChild) {
          this.element.prepend(tooltipIcon(componentName, "component"));
        }
      };

      // Raw plugin-outlets
      const oldRawHelper = RawHandlebars.helpers["raw-plugin-outlet"];

      RawHandlebars.helpers["raw-plugin-outlet"] = function(args) {
        const oldRawHelperResult = oldRawHelper.apply(this, arguments);
        const tooltip = tooltipIcon(args.hash.name, "raw_plugin_outlet");

        return oldRawHelperResult
          ? htmlSafe(oldRawHelperResult + tooltip)
          : htmlSafe(tooltip);
      };

      // Widgets and widget decorators
      const oldDrawMethod = Widget.prototype.draw;

      Widget.prototype.draw = function() {
        const oldMethodResult = oldDrawMethod.apply(this, arguments);

        if (widgetIgnoreList.includes(this.name)) return oldMethodResult;

        const widget = this;

        const newStuff = tooltipIcon(this.name, "widget");
        const before = tooltipIcon(this.name, "widget_decorator", "before");
        const after = tooltipIcon(this.name, "widget_decorator", "after");

        const children = [...oldMethodResult.children];
        children.unshift(before, newStuff);
        children.push(after);

        oldMethodResult.children = children;

        return oldMethodResult;
      };

      const canvas = document.createElement("canvas");
      canvas.className = "highlight";
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      document.body.appendChild(canvas);

      const resizeCanvasHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };

      // starting work towards a service
      let currentElement;

      window.addEventListener("resize", () => {
        debounce(this, resizeCanvasHandler, 250);
      });

      const tooltippyboi = event => {
        event.stopPropagation();
        event.preventDefault();

        // destroy and readd the tooltip
        const target = event.target;
        console.log(target);
        if (target.closest(".tippy-box")) return;
        if (target.tagName === "BODY") return;
        if (target.classList && target.classList[0] === "ember-view") return;
        currentElement = target;
        if (!target.classList.length) return;

        const selector = [];

        selector.push(target.classList[0] || target.tagName);

        if (target.parentNode && target.parentNode.classList.length) {
          selector.unshift(target.parentNode.classList[0]);
        }

        if (
          target.parentNode.parentNode &&
          target.parentNode.parentNode.classList.length
        ) {
          selector.unshift(target.parentNode.parentNode.classList[0]);
        } else {
          selector.unshift(target.tagName.toLowerCase());
        }

        //  target.style.background = "red";

        const content = target.classList;
        delete content["ember-view"];

        target._tooltip = tippy(target, {
          maxWidth: 300,
          content: () => {
            return selector.flat();
          },
          followCursor: true,
          interactive: true,
          interactiveBorder: 100,
          inertia: true,
          inlinePositioning: true,
          offset: [0, 0],
          arrow: false,
          placement: "bottom-start",

          appendTo: () => document.body,
          zIndex: 10001,
          onShown(tooltip) {
            var loc = target.getBoundingClientRect();

            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.clearRect(loc.left, loc.top, loc.width, loc.height);
            canvas.classList.add("is-visible");
          },
          onHidden(tooltip) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove("is-visible");
            setTimeout(function() {}, 500);
          }
        });

        //
        tippy.hideAll({ duration: 0 });
        target._tooltip.show();

        console.log("one");

        /*
        later(
          this,
          () => {
            target._tooltip.show();
          },
          200
        );

        */

        ///

        //return;
        if (!event.target.classList.contains("tm-tooltip-trigger")) return;

        const marker = event.target;

        if (!marker || !marker.dataset) return;

        const rootElem = marker.parentNode;

        const name = marker.dataset.name;
        const type = marker.dataset.type;

        const contentTm = `
          <span class="tm-tooltip">
            <span class="tm-content">
              <span class="tm-type">${tmTypes[type]}</span>
              <div class="tm-name">${name}</div>
              <span class="tm-describtion">${tmDescribtions[type]}</span>
              <div class="tm-tm-meta-info">

              </div>
            </span>
          </span>`;

        //<a href="${getURL(type, name)}" target="_blank">
        //  ${iconHTML("fab-js", { class: "tm-js-icon" })}
        //  </a>

        tippy(event.target, {
          maxWidth: 600,
          content: contentTm,
          interactive: true,
          allowHTML: true,
          appendTo: () => document.body,
          interactiveBorder: 0,

          zIndex: 10001,

          onShown(tooltip) {
            var loc = rootElem.getBoundingClientRect();

            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.clearRect(loc.left, loc.top, loc.width, loc.height);

            canvas.classList.add("is-visible");
          },
          onHidden(tooltip) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove("is-visible");
            setTimeout(function() {}, 500);
          }
        });
      };

      window.addEventListener("mouseover", event => {
        //tippy.hideAll({ duration: 0 });

        throttle(this, tooltippyboi, event, 10);
      });

      window.addEventListener("mouseleave", event => {
        console.log("mouseout");
        tippy.hideAll({ duration: 0 });

        if (event.target._tooltip) {
          event.target._tooltip.destroy();
          //later(this, () => {}, 1000);
        }
      });

      //window.addEventListener("mouseleave", event => {
      //    console.log(event.target);
      //  });

      ///

      ///

      api.decorateWidget("header-icons:after", function(helper) {
        const headerState = helper.widget.parentWidget.state;

        return helper.attach("header-dropdown", {
          title: "custom-menu",
          icon: "bars",
          iconId: "toggle-custom-menu",
          active: headerState.customMenuVisible,
          action: "toggleCustomMenu"
        });
      });

      api.attachWidgetAction("header", "toggleCustomMenu", function() {
        this.state.customMenuVisible = !this.state.customMenuVisible;
      });

      api.addHeaderPanel("custom-menu", "customMenuVisible", function(
        attrs,
        state
      ) {
        // This callback has to be provided. Don’t know why.
      });

      api.createWidget("custom-menu", {
        tagName: "div.custom-panel",
        buildKey: () => "tm-menu",

        currentRouteName() {
          const router = this.register.lookup("router:main");
          console.log(router);
          return router.currentRouteName;
        },

        settings: {
          maxWidth: 320
        },

        defaultState() {
          return {
            "tm-plugin-outlets-active": false,
            "tm-raw-plugin-outlets-active": false,
            "tm-widget-decorators-active": false,
            "tm-widgets-active": false,
            "tm-components-active": false
          };
        },

        // needs a default state
        input(event) {
          const target = event.target;
          console.log(target.checked);

          const type = target.dataset.tmType;
          this.state[type] = target.checked;

          document.body.classList.toggle(type);

          document.body.classList.add("elementToFadeInAndOut");

          // use later
          // this will also work for the fade
          setTimeout(function() {
            document.body.classList.remove("elementToFadeInAndOut");
          }, 500);
        },

        // too much code repetition
        panelContents() {
          return h("div.class-tm-menu-contents", [
            h("div.tm-menu-section.tm-plugin-outlets", [
              h("span.tm-menu-section-name", "plugin outlets"),
              [
                h("lable.Switchbox", [
                  h("input", {
                    attributes: {
                      type: "checkbox",
                      "data-tm-type": "tm-plugin-outlets-active",
                      "data-tm-checked": this.state["tm-plugin-outlets-active"]
                    }
                  }),
                  h("span")
                ])
              ]
            ]),
            //
            h("div.tm-menu-section.tm-raw-plugin-outlets", [
              h("span.tm-menu-section-name", "raw plugin-outlets"),
              [
                h("lable.Switchbox", [
                  h("input", {
                    attributes: {
                      type: "checkbox",
                      "data-tm-type": "tm-raw-plugin-outlets-active",
                      checked: localStorage.getItem(
                        "tm-raw-plugin-outlets-active"
                      )
                    }
                  }),
                  h("span")
                ]),
                h("span")
              ]
            ]),
            ///
            h("div.tm-menu-section.tm-widget-decorators", [
              h("span.tm-menu-section-name", "widget decorators"),
              [
                h("lable.Switchbox", [
                  h("input", {
                    attributes: {
                      type: "checkbox",
                      "data-tm-type": "tm-widget-decorators-active",
                      checked: localStorage.getItem(
                        "tm-widget-decorators-active"
                      )
                    }
                  }),
                  h("span")
                ]),
                h("span")
              ]
            ]),
            ///
            h("div.tm-menu-section.tm-widgets", [
              h("span.tm-menu-section-name", "widgets"),
              [
                h("lable.Switchbox", [
                  h("input", {
                    attributes: {
                      type: "checkbox",
                      "data-tm-type": "tm-widgets-active",
                      checked: localStorage.getItem("tm-widgets-active")
                    }
                  }),
                  h("span")
                ]),
                h("span")
              ]
            ]),
            ///
            h("div.tm-menu-section.tm-components", [
              h("span.tm-menu-section-name", "components"),
              [
                h("lable.Switchbox", [
                  h("input", {
                    attributes: {
                      type: "checkbox",
                      "data-tm-type": "tm-components-active",
                      checked: localStorage.getItem("tm-components-active")
                    }
                  }),
                  h("span")
                ]),
                h("span")
              ]
            ]),

            h("br"),

            h("div", ["Current Route:", h("bold", this.currentRouteName())])
          ]);
        },

        html() {
          return this.attach("menu-panel", {
            contents: () => this.panelContents(),
            maxWidth: this.settings.maxWidth
          });
        }
      });

      /////

      //

      api.modifyClass("component:plugin-outlet", {
        init() {
          this._super(...arguments);

          const args = buildArgsWithDeprecations(
            this.args || {},
            this.deprecatedArgs || {}
          );

          const newConnectors = [
            ...renderedConnectorsFor("tm-tooltip-outlet", args, this)
          ];

          this.set("connectors", newConnectors.concat(this.connectors));
        }
      });

      schedule("afterRender", () => {
        const ignoreList = [
          document.querySelector("#main"),
          document.querySelector("#main-outlet"),
          document.querySelector("html"),
          document.querySelector(".tm-tooltip-trigger"),
          document.body
        ];

        ///

        ////
      });
    });
  }
};

// Do something with the API here
/*


/// element picker thing


new ElementPicker({
  ignoreElements: [
    document.querySelector("#main"),
    document.querySelector("#main-outlet"),
    document.querySelector("html"),
    document.querySelector(".tm-tooltip-trigger"),
    document.body
  ],
  //container: document.querySelector("#main-outlet"),
  borderWidth: 0,
  transition: "all 50ms ease",
  action: {
    trigger: "mouseover",
    callback: function(target) {
      console.log("enter");

      // need to remove the old tooltips after moving hover

      //const selector = `.${content.classList[0]}  .${target.parentNode.classList[0]}`;





    }
  }
});

///


///


import DiscourseRoute from "discourse/routes/discourse";




const oldAfterModel = DiscourseRoute.prototype.afterModel;

DiscourseRoute.prototype.afterModel = function() {
  oldAfterModel(this, arguments);
  console.log(this);
};

///


///

var generateQuerySelector = function(el) {
  if (el.tagName.toLowerCase() == "html") return "HTML";
  var str = el.tagName;
  str += el.id != "" ? "#" + el.id : "";
  if (el.className) {
    var classes = el.className.split(/\s/);
    for (var i = 0; i < classes.length; i++) {
      str += "." + classes[i];
    }
  }
  return generateQuerySelector(el.parentNode) + " > " + str;
};


///


/// router stuff


api.modifyClass("route:application", {
  actions: {
    willTransition() {
      this._super(...arguments);

      console.log(this);
    }
  }
});

const router = api.container.lookup("router:main");
router.reopen({
  @afterRender
  didTransition: function() {
    this._super(...arguments);
    console.log(this);
  }
});


////


// This should be the future default

//    console.log(Object.keys(Ember.TEMPLATES));

//  let template = "Handlebars <b>{{doesWhat}}</b> precompiled!";

//  let compiled = Ember.Handlebars.precompiled(template);
//  console.log(compiled);

//  this.connectors.push(tmTooltip);



//  console.log(Object.keys(Ember.TEMPLATES));

  ///


//  this.layout.partial = api.container.lookup(
//    "template:components/tm-component"
//  );

/// this works


schedule("afterRender", () => {
  const isStyleRule = rule => rule.type === 1;

  const getCSSCustomPropIndex = () =>
    [...document.styleSheets].reduce(
      (finalArr, sheet) =>
        finalArr.concat(
          [...sheet.cssRules]
            .filter(isStyleRule)
            .reduce((propValArr, rule) => {
              const props = [...rule.style]
                .map(propName => [
                  propName.trim(),
                  rule.style.getPropertyValue(propName).trim()
                ])

                .filter(([propName]) => propName.indexOf("--") === 0);

              return [...propValArr, ...props];
            }, [])
        ),
      []
    );

  const cssCustomPropIndex = getCSSCustomPropIndex();

  document.querySelector(".colors").innerHTML = cssCustomPropIndex.reduce(
    (str, [prop, val]) => `${str}<li class="color">
<b class="color__swatch" style="--color: ${val}"></b>
<div class="color__details">
  <input value="${prop}" readonly />
  <input value="${val}" readonly />
</div>
</li>`,
    ""
  );
});


///


onCreate(tooltip) {
  console.log("create");
  var loc = rootElem.getBoundingClientRect();
  var canvas = document.createElement("canvas");
  canvas.className = "highlight";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext("2d");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.clearRect(
    loc.left - padding,
    loc.top - padding,
    loc.width + padding * 2,
    loc.height + padding * 2
  );
  document.body.appendChild(canvas);
},
onHide(tooltip) {
  const overlayCanvas = document.querySelector("canvas.highlight");

  if (!overlayCanvas || !overlayCanvas.length) return;

  overlayCanvas.style.opacity = 0;

  setTimeout(function() {
    document.body.removeChild(overlayCanvas);
  }, 250);

  //rootElem.classList.remove("hover-boi");
  console.log("works");
},
onDestroy() {}

///


api.modifyClass("component:plugin-outlet", {
  init() {
    this._super(...arguments);

    api.decoratePluginOutlet(
      "discovery-list-container-top",
      (elem, args) => {
        if (elem.classList.contains("foo")) {
          elem.style.backgroundColor = "yellow";
        }
      }
    );

    schedule("afterRender", () => {
      console.log(this);
      this.noTags = false;
      this.tagName = "span";
      //this.element.prepend(tooltipIcon(this.name, "plugin_outlet"));
    });
  }
});


// Plugin-outlets
api.modifyClass("component:plugin-outlet", {
  @on("didInsertElement")
  @afterRender
  addTooltip() {
    console.log("one");
    schedule("afterRender", () => {
      console.log(this);
      this.element.prepend(tooltipIcon(this.name, "plugin_outlet"));
    });
  }
});

xxxxx

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
