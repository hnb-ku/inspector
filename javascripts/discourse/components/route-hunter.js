import Component from "@ember/component";

export default Component.extend({
  classNames: ["route-hunter", "visible"],
  currentRouteName: "",

  buildArgs() {
    return {};
  },

  didInsertElement() {
    this._super(...arguments);
    this.appEvents.on("page:changed", this, "_routeChanged");
  },

  willDestroyElement() {
    this._super(...arguments);
    this.appEvents.off("page:changed", this, "_routeChanged");
  },

  _routeChanged(route) {
    //console.log(route);
    this.set("currentRouteName", route.currentRouteName);
    //this.routeHistory.push(route.url);
    //this.set("currentRouteIndex", this.routeHistory.length);

    //this.queueRerender();
  }
});
