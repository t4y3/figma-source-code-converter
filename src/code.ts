import beautify from "beautify";
import { toHtml } from "hast-util-to-html";
import { generateElement } from "./utils/generateElement.ts";

// Make sure that we're in Dev Mode and running codegen
if (figma.editorType === "dev" && figma.mode === "codegen") {
  figma.codegen.on("generate", async (event) => {
    const { node } = event;
    const tree = await generateElement(node);
    const beautifyCode = beautify(toHtml(tree || []), { format: "html" });

    // @see https://www.figma.com/plugin-docs/api/CodeBlockNode/#codelanguage
    return [
      {
        language: "HTML",
        code: beautifyCode,
        title: "Formatted HTML",
      },
    ];
  });
}
