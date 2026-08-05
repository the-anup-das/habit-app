module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      () => ({
        visitor: {
          MetaProperty(path) {
            if (path.node.meta.name === "import" && path.node.property.name === "meta") {
              path.replaceWithSourceString('({ url: "" })');
            }
          },
        },
      }),
    ],
  };
};
