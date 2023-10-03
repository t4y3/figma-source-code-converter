// Make sure that we're in Dev Mode and running codegen
if (figma.editorType === "dev" && figma.mode === "codegen") {
  figma.codegen.on("generate", async (event) => {
    const { node, language } = event;

    const htmlCode = await generateCodeString(node);

    // @see https://www.figma.com/plugin-docs/api/CodeBlockNode/#codelanguage
    return [
      {
        language: "HTML",
        code: formatHTML(htmlCode),
        title: "Formatted HTML",
      },
    ];
  });
}

// 生成するノードのタイプ
const generateNodeTypes: Partial<SceneNode["type"]>[] = [
  "COMPONENT",
  "COMPONENT_SET",
  "ELLIPSE",
  "FRAME",
  "GROUP",
  "INSTANCE",
  "LINE",
  "LINK_UNFURL",
  "MEDIA",
  "POLYGON",
  "RECTANGLE",
  "SHAPE_WITH_TEXT",
  "SLICE",
  "TEXT",
  "VECTOR",
  "STAR",
  "POLYGON",
];

// SVGをstringとしてエクスポートするNodeType
const svgExportNodeTypes: Partial<SceneNode["type"]>[] = [
  "VECTOR",
  "STAR",
  "POLYGON",
];

async function generateCodeString(node: SceneNode, depth = 0): Promise<string> {
  const { type } = node;

  if (!generateNodeTypes.includes(type)) {
    return "";
  }

  // TODO: この関数内の処理をNodeTypeによって切り分ける

  // SVGの場合はSVG文字列を取得する
  if (svgExportNodeTypes.includes(type)) {
    const svgString = await node.exportAsync({
      format: "SVG_STRING",
    });
    return svgString;
  }

  if ("componentPropertyDefinitions" in node) {
    console.warn(
      generatePropsTypeFromComponentPropertyDefinitions(
        node.componentPropertyDefinitions,
      ),
    );
  }

  const elementName = "div";

  // CSSPropertiesを取得する
  const cssJson = await node.getCSSAsync();
  const hasFillImageObject = Object.entries(cssJson).find(
    ([key, value]) => value.indexOf("<path-to-image>") !== -1,
  );
  // TODO: 画像の場合は置換が必要かも
  const fillImages = await getFillImage(node);
  if (
    hasFillImageObject &&
    fillImages &&
    0 < fillImages?.length &&
    fillImages[0].bytes
  ) {
    const imgSrc = figma.base64Encode(fillImages[0].bytes);

    cssJson[hasFillImageObject[0]] = hasFillImageObject[1].replace(
      `<path-to-image>`,
      `'data:image/png;base64,${imgSrc}'`,
    );
    cssJson["background-size"] = "cover";
  }

  const content = ("characters" in node && node.characters) || "";
  const styleString = cssJsonToStyleString(cssJson);
  let childrenString = "";

  // If the node has children, process them recursively
  if ("children" in node && node.children.length > 0) {
    for (let child of node.children) {
      const code = await generateCodeString(child, depth + 1);
      childrenString += `\n${code}\n`;
    }
  } else {
    childrenString = content;
  }

  return `<${elementName} style="${styleString}">${childrenString}</${elementName}>`;
}

/**
 * Converts a CSS JSON object into a string representing CSS style declarations.
 *
 * @param {object} cssJson - The CSS JSON object to convert.
 * @returns {string} - The CSS style string.
 */
const cssJsonToStyleString = (cssJson: { [key: string]: string }): string => {
  const styleString = Object.keys(cssJson).reduce(
    (acc, key) =>
      acc +
      key
        .split(/(?=[A-Z])/)
        .join("-")
        .toLowerCase() +
      ":" +
      cssJson[key] +
      ";",
    "",
  );
  return styleString;
};

/**
 * Formats an HTML string with indentation.
 *
 * @param {string} htmlString - The HTML string to be formatted.
 * @param {object} options - An optional object containing formatting options.
 * @param {number} options.tabWidth - The number of spaces to be used for indentation. Default is 2.
 * @returns {string} - The formatted HTML string.
 */
function formatHTML(
  htmlString: string,
  options: { tabWidth?: number } = {},
): string {
  const tabWidth = options.tabWidth || 2; // インデントのスペース数
  const selfClosingTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
  ]);

  const lines = htmlString.split("\n");
  let currentIndent = 0;
  let formattedHTML = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;

    const isClosingTag = line.startsWith("</");
    const isOpeningTag = !isClosingTag && line.startsWith("<");
    const isSelfClosingTag = isOpeningTag && line.endsWith("/>");

    if (isClosingTag) {
      currentIndent--;
    }

    formattedHTML += " ".repeat(currentIndent * tabWidth) + line + "\n";

    if (isOpeningTag) {
      if (!isSelfClosingTag && !selfClosingTags.has(getTagName(line))) {
        currentIndent++;
      }
    }
  }

  return formattedHTML.trim();
}

/**
 * Retrieves the tag name from the provided HTML tag.
 *
 * @param {string} tag - The HTML tag from which to extract the tag name.
 * @returns {string} - The extracted tag name.
 */
function getTagName(tag: string): string {
  const match = tag.match(/<\/?([^\s>]+)/);
  return match ? match[1] : "";
}

/**
 * Generates an object containing the prop types for a component based on the given property definitions.
 *
 * @see https://www.figma.com/plugin-docs/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/
 * @param {ComponentPropertyDefinitions} definitions - The property definitions for the component.
 * @returns {Object} - An object containing the prop types with keys representing the property names and values representing the types.
 */
const generatePropsTypeFromComponentPropertyDefinitions = (
  definitions: ComponentPropertyDefinitions,
) => {
  const props: { [key: string]: string } = {};

  Object.entries(definitions).forEach(([key, definition]) => {
    switch (definition.type) {
      case "TEXT":
        props[key] = "string";
        break;
      case "BOOLEAN":
        props[key] = "boolean";
        break;
      case "INSTANCE_SWAP":
        props[key] = "string";
        break;
      case "VARIANT":
        props[key] = "string";
        break;
    }
  });
  return props;
};

const getFillImage = async (
  node: SceneNode,
): Promise<
  | {
      bytes: Uint8Array | undefined;
      size:
        | {
            width: number;
            height: number;
          }
        | undefined;
    }[]
  | null
> => {
  if (!("fills" in node) || !Array.isArray(node.fills)) {
    return null;
  }

  const imageFills: ImagePaint[] = node.fills.filter(
    (fill) => fill.type === "IMAGE",
  );

  if (imageFills.length < 1) {
    return null;
  }

  const result = await Promise.all(
    imageFills.map(async (fill) => {
      const image = figma.getImageByHash(fill.imageHash || "");
      const bytes = await image?.getBytesAsync();
      const size = await image?.getSizeAsync();
      return {
        bytes,
        size,
      };
    }),
  );
  return result;
};
