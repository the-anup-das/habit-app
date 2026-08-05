module.exports = ({ types: t }) => ({
  visitor: {
    MetaProperty(path) {
      if (path.node.meta.name === "import" && path.node.property.name === "meta") {
        path.replaceWith(
          t.objectExpression([t.objectProperty(t.identifier("url"), t.stringLiteral(""))]),
        );
      }
    },
  },
});
