/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "event-infra",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const eventBus = new aws.cloudwatch.EventBus("EventBus", {
      name: "whiskey-event-bus",
    });
    const schemaRegistry = new aws.schemas.Registry("SchemaRegistry", {
      name: "com.mattwyskiel.whiskey.events",
    });
  },
});
