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

import highlightSyntax from "discourse/lib/highlight-syntax";

// cleanup
const getMatchedCSSRules = el =>
  []
    .concat(
      ...[...document.styleSheets].map(s => [...(s.cssRules || [])])
    ) /* 1 */
    .filter(r => el.matches(r.selectorText));

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
  "route-hunter"
  //"plugin-connector"
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

const scrollbarWidth = window.innerWidth - document.body.clientWidth + "px";
document.documentElement.style.setProperty("--scrollbar-width", scrollbarWidth);

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
  initialize(container) {
    withPluginApi("0.8", api => {
      api.decoratePluginOutlet("tm-tooltip-outlet", (elem, args) => {
        console.log("ffds");
        console.log(args);
        console.log(elem);

        const trigger = elem.querySelector(".tm-tooltip-trigger");

        console.log("before0");
        console.log(trigger);

        trigger.dataset.foo = "thing";
        const context = args;

        trigger.context = args;

        console.log("after1");
        console.log(trigger.context);
      });

      const siteSettings = container.lookup("site-settings:main");
      const session = container.lookup("session:main");

      const tooltipIcon = (name, type, position, context) => {
        const className = `tm-${type.replace(/_/g, "-")}`;

        if (type === "widget" || type === "widget_decorator") {
          return h(
            `span.tm-tooltip-trigger.${className}`,
            {
              attributes: {
                "data-name": position ? `${name}:${position}` : name,
                "data-type": type
              },
              onmouseover: function(e) {
                e.target.context = context;
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
          thing.context = context;

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

        if (this.element && this.element.firstElementChild && !this.myAction) {
          this.element.prepend(
            tooltipIcon(componentName, "component", null, this.attrs)
          );
        }
      };

      // Raw plugin-outlets
      const oldRawHelper = RawHandlebars.helpers["raw-plugin-outlet"];

      RawHandlebars.helpers["raw-plugin-outlet"] = function(args) {
        const oldRawHelperResult = oldRawHelper.apply(this, arguments);

        //console.log(this);
        const tooltip = tooltipIcon(
          args.hash.name,
          "raw_plugin_outlet",
          null,
          this
        );

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
        const attrs = this.attrs;

        const newStuff = tooltipIcon(this.name, "widget", null, this.attrs);
        const before = tooltipIcon(
          this.name,
          "widget_decorator",
          "before",
          this.attrs
        );
        const after = tooltipIcon(
          this.name,
          "widget_decorator",
          "after",
          this.attrs
        );

        const children = [...oldMethodResult.children];
        children.unshift(before, newStuff);
        children.push(after);

        oldMethodResult.children = children;

        return oldMethodResult;
      };

      // plugin-outlets

      api.modifyClass("component:plugin-outlet", {
        init() {
          this._super(...arguments);

          const newConnectors = [
            ...renderedConnectorsFor("tm-tooltip-outlet", this.args, this)
          ];

          this.set("connectors", newConnectors.concat(this.connectors));
        }
      });

      // highlight canvas
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

        // destroy and re-add the tooltip
        const target = event.target;

        if (target.closest(".tippy-box")) return;

        console.log(event.target);

        /*
        //if (target.tagName === "BODY") return;
        //if (target.classList && target.classList[0] === "ember-view") return;
        currentElement = target;
        //if (!target.classList.length) return;

        let selectors = [];

        if (target.tagName === "HTML" || target.tagName === "BODY") {
          selectors.push(target.tagName.toLowerCase());
        }

        if (target.classList.length) {
          selectors.push(`.${target.classList[0]}`);
        } else {
          selectors.push(target.tagName.toLowerCase());
        }

        if (target.parentElement && target.parentElement.classList.length) {
          selectors.unshift(`.${target.parentElement.classList[0]}`);
        }

        if (
          target.parentElement.parentElement &&
          target.parentElement.parentElement.classList.length
        ) {
          selectors.unshift(
            `.${target.parentElement.parentElement.classList[0]}`
          );
        } else if (target.parentElement.parentElement) {
          selectors.unshift(
            target.parentElement.parentElement.tagName.toLowerCase()
          );
        }

        if (target.id && !!target.id.indexOf("ember")) {
          selectors = [`#${target.id}`];
        }

        let cleanSelectors = selectors.filter(selector => {
          return selector !== "ember-view" && selector !== "ember-application";
        });

        *
         * usage
         */

        // if target has no styles move to parent?

        // get rid of " "

        // get CSS
        let cssRules = getMatchedCSSRules(target);

        if (!cssRules.length) {
          cssRules = getMatchedCSSRules(target.parentNode);
        }

        //  console.log(cssRules);

        const content = [];
        // const coreSelectors = [];
        //  const coreStyles = [];
        //  const themeSelectors = [];
        //  const themeStyles = [];
        //  const pluginSelectors = [];
        //  const pluginStyles = [];

        // core selectors
        const rawCoreSelectors = cssRules
          .filter(rule => {
            const parentStyleSheet = rule.parentStyleSheet;

            return (
              parentStyleSheet.ownerNode.dataset.target == "desktop" ||
              parentStyleSheet.ownerNode.dataset.target == "mobile" ||
              parentStyleSheet.ownerNode.dataset.target == "admin"
            );
          })
          .map(rule => rule.selectorText);

        const coreSelectors = [...new Set(rawCoreSelectors)].join("\n");

        if (coreSelectors.length) {
          content.push(
            `<h3>Discourse Selectors</h3>`,
            `<pre><code contentEditable="true" class="lang-css hljs">${coreSelectors}</code></pre>`
          );
        }
        //
        // core css rules
        const coreStyles = cssRules
          .filter(rule => {
            const parentStyleSheet = rule.parentStyleSheet;
            return (
              parentStyleSheet.ownerNode.dataset.target == "desktop" ||
              parentStyleSheet.ownerNode.dataset.target == "mobile" ||
              parentStyleSheet.ownerNode.dataset.target == "admin"
            );
          })
          .map(rule => rule.cssText);

        const coreCss = coreStyles
          .join("\n")
          .replace(/{/g, "{\n ")
          .replace(/;/g, ";\n ")
          .replace(/  }/g, "}\n")
          .replace(/, (?![^()]*\))/g, ",\n");

        if (coreStyles.length) {
          content.push(
            `<h3>Discourse CSS</h3>`,
            `<pre><code contentEditable="true" class="lang-css hljs">${coreCss}</code></pre>`
          );
        }

        const pluginSelectors = cssRules
          .filter(rule => {
            const parentStyleSheet = rule.parentStyleSheet;
            return (
              parentStyleSheet.href.indexOf("theme") < 0 &&
              parentStyleSheet.ownerNode.dataset.target !== "desktop" &&
              parentStyleSheet.ownerNode.dataset.target !== "mobile" &&
              parentStyleSheet.ownerNode.dataset.target !== "admin"
            );
          })
          .map(rule => rule.selectorText);

        const formattedPluginSelectors = pluginSelectors
          .filter((item, index) => pluginSelectors.indexOf(item) === index)
          .join("\n");

        if (formattedPluginSelectors.length) {
          content.push(
            `<h3>Plugin Selectors</h3>`,
            `<pre><code contentEditable="true">${formattedPluginSelectors}</code></pre>`
          );
        }

        const pluginStyles = cssRules
          .filter(rule => {
            const parentStyleSheet = rule.parentStyleSheet;
            //  console.log(parentStyleSheet);
            return (
              parentStyleSheet.href.indexOf("theme") < 0 &&
              parentStyleSheet.ownerNode.dataset.target !== "desktop" &&
              parentStyleSheet.ownerNode.dataset.target !== "mobile" &&
              parentStyleSheet.ownerNode.dataset.target !== "admin"
            );
          })
          .map(rule => rule.cssText);

        const pluginCss = pluginStyles
          .join("\n")
          .replace(/{/g, "{\n ")
          .replace(/;/g, ";\n ")
          .replace(/  }/g, "}\n")
          .replace(/, (?![^()]*\))/g, ",\n");

        if (pluginCss.length) {
          content.push(
            `<h3>Plugin CSS</h3>`,
            `<pre><code contentEditable="true" class="lang-css hljs">${pluginCss}</code></pre>`
          );
        }

        //
        // theme Selectors
        const themeSelectors = cssRules
          .filter(rule => rule.parentStyleSheet.href.indexOf("theme") > 0)
          .map(rule => rule.selectorText);

        const formattedThemeSelectors = themeSelectors
          .filter((item, index) => themeSelectors.indexOf(item) === index)
          .join("\n");

        if (formattedThemeSelectors.length) {
          content.push(
            `<h3>Theme Selectors</h3>`,
            `<pre><code contentEditable="true">${formattedThemeSelectors}</code></pre>`
          );
        }
        //
        const themeStyles = cssRules
          .filter(rule => rule.parentStyleSheet.href.indexOf("theme") > 0)
          .map(rule => rule.cssText);

        const themeCss = themeStyles
          .join("\n")
          .replace(/{/g, "{\n ")
          .replace(/;/g, ";\n ")
          .replace(/  }/g, "}\n")
          .replace(/, (?![^()]*\))/g, ",\n");

        if (themeCss.length) {
          content.push(
            `<h3>Theme CSS</h3>`,
            `<pre><code contentEditable="true" class="lang-css hljs">${themeCss}</code></pre>`
          );
        }

        /*

            `<h3>Theme Styles</h3>` +
            `<pre><code contentEditable="true" data-gramm_editor="false" class="lang-css hljs">${themeCss}</code></pre>` +
            `<h3>Plugin Styles</h3>` +
            `<pre><code contentEditable="true" data-gramm_editor="false" class="lang-css hljs">${pluginCss}</code></pre>`;

            */
        /*


/*

`<a target="blank" href=https://github.com/discourse/discourse/search?l=SCSS&q="${cleanSelectors.join(
  "%20"
)}"">thing</a>

*/

        // css popup
        target._tooltip = tippy(target, {
          maxWidth: 800,
          popperOptions: {
            strategy: "fixed",
            modifiers: [
              {
                name: "preventOverflow",
                options: {
                  altAxis: true,
                  tether: false
                }
              }
            ]
          },
          content: content.join(""),
          //followCursor: "initial",
          interactive: true,
          interactiveBorder: 50,
          //inertia: true,
          //inlinePositioning: true,
          //offset: [0, 0],
          //arrow: false,
          placement: "auto",
          sticky: true,
          top: event.clientY,
          bottom: event.clientY,
          left: event.clientX,
          right: event.clientX,
          allowHTML: true,

          appendTo: () => document.body,
          zIndex: 10001,
          onCreate(tooltip) {
            document.documentElement.classList.add("no-scroll", "no-highlight");
            var loc = target.getBoundingClientRect();
            highlightSyntax(tooltip.popper, siteSettings, session);
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.clearRect(loc.left, loc.top, loc.width, loc.height);
            canvas.classList.add("is-visible");
          },
          onHidden(tooltip) {
            document.documentElement.classList.remove(
              "no-scroll",
              "no-highlight"
            );
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove("is-visible");
            setTimeout(function() {}, 500);
            target._tooltip.destroy();
          }
        });

        //
        tippy.hideAll({ duration: 0 });
        target._tooltip.show();

        //  console.log("one");

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

        // component / plugin-outlet / widget popup
        tippy(event.target, {
          maxWidth: 600,
          content: contentTm,
          interactive: true,
          allowHTML: true,
          appendTo: () => document.body,
          interactiveBorder: 0,

          zIndex: 10001,

          onCreate(tooltip) {
            const myJSON = { ans: 42 };

            const formatter = new JSONFormatter(event.target.context, 1, {
              theme: "dark"
            });

            tooltip.popper.firstChild.firstChild.append(formatter.render());

            //  console.log(tooltip);
          },

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

        return false;
      };

      window.addEventListener("contextmenu", event => {
        //tippy.hideAll({ duration: 0 });
        if (event.target.closest(".tippy-box")) return;
        if (event.target._tooltip) {
          //  event.target._tooltip.destroy();
          //later(this, () => {}, 1000);
        }
        tooltippyboi(event);
      });

      window.addEventListener("mouseover", event => {
        if (document.documentElement.classList.contains("no-highlight")) return;
        if (event.target.closest(".tippy-box")) return;
        var loc = event.target.getBoundingClientRect();

        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.clearRect(loc.left, loc.top, loc.width, loc.height);
        canvas.classList.add("is-visible");
      });

      window.addEventListener("mouseleave", event => {
        //  console.log("mouseout");
        if (event.target.closest(".tippy-box")) return;

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
    });
  }
};

/* header panel



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
    //  console.log(router);
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
    //  console.log(target.checked);

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

*/
