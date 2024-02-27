const Lab = require("@hapi/lab");
const Code = require("@hapi/code");

const Babel = require("@babel/core");

const lab = Lab.script();
exports.lab = lab;
const { expect } = Code;
const { suite, test } = lab;

let internals = {};
internals.transform = function (content, filename) {
  const regexp = new RegExp("node_modules");
  if (regexp.test(filename)) {
    return content;
  }

  let transformed = Babel.transform(content, {
    presets: [
      "@babel/typescript",
      [
        "@babel/preset-env",
        {
          targets: {
            node: "20",
          },
        },
      ],
    ],
    filename: filename,
    sourceMap: "inline",
    sourceFileName: filename,
    auxiliaryCommentBefore: "$lab:coverage:off$",
    auxiliaryCommentAfter: "$lab:coverage:on$"
  });

  return transformed.code;
};
internals.extensions = [".js", ".jsx", ".ts", ".tsx", "es", "es6"];
internals.methods = [];
for (let i = 0, il = internals.extensions.length; i < il; ++i) {
  internals.methods.push({
    ext: internals.extensions[i],
    transform: internals.transform,
  });
}

module.exports = internals.methods;
