import { generatePropsTypeFromComponentPropertyDefinitions } from "./generatePropsTypeFromComponentPropertyDefinitions.ts";
import { getFillImage } from "./getFillImage.ts";
import { h } from "hastscript";
import { Element, Text } from "hast";

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

/**
 * Generates a string of code for a given SceneNode.
 *
 * @param {SceneNode} node - The SceneNode to generate the code for.
 * @param {number} [depth=0] - The depth of the node in the hierarchy.
 * @returns {Promise<string>} - The generated code string.
 */
export async function generateElement(
  node: SceneNode,
  depth = 0,
): Promise<Element | null> {
  const { type } = node;

  if (!generateNodeTypes.includes(type)) {
    return null;
  }

  // SVGの場合はSVG文字列を取得する
  if (svgExportNodeTypes.includes(type)) {
    return null;
    // // @see https://bugreports.qt.io/browse/QDS-4690
    // const svgString = await node
    //   .exportAsync({
    //     format: "SVG_STRING",
    //   })
    //   .catch(() => {
    //     return "";
    //   });
    // return svgString;
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
    ([, value]) => value.indexOf("<path-to-image>") !== -1,
  );
  const fillImages = await getFillImage(node);
  if (
    hasFillImageObject &&
    fillImages &&
    0 < fillImages?.length &&
    fillImages[0].bytes
  ) {
    // NOTE: 重すぎるのでコメントアウト
    // const imgSrc = figma.base64Encode(fillImages[0].bytes);
    //
    // cssJson[hasFillImageObject[0]] = hasFillImageObject[1].replace(
    //   `<path-to-image>`,
    //   `'data:image/png;base64,${imgSrc}'`,
    // );
    cssJson["background-size"] = "cover";
  }

  const content = ("characters" in node && node.characters) || "";
  const children: (Element | Text)[] = [];

  // If the node has children, process them recursively
  if ("children" in node && node.children.length > 0) {
    for (let child of node.children) {
      const code = await generateElement(child, depth + 1);
      code && children.push(code);
    }
  } else {
    children.push({ type: "text", value: content });
  }

  return h(elementName, { style: cssJson }, children);
}
