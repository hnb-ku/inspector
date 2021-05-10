import { schedule } from "@ember/runloop";

export default {
  _foo: true,
  setupComponent(args) {
    this.setProperties({
      pluginOutlet: true
    });
  },
  actions: {
    myAction() {
      console.log(this.parentView);
    }
  }
};
