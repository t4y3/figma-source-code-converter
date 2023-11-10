import { toHtml } from "hast-util-to-html";
import prettierPluginHtml from "prettier/plugins/html";
import { format } from "prettier/standalone";
import { generateElement } from "./utils/generateElement.ts";

// Make sure that we're in Dev Mode and running codegen
if (figma.editorType === "dev" && figma.mode === "codegen") {
  figma.codegen.on("generate", async (event) => {
    const { node } = event;

    // TODO: Component Setは別途でまとめる


    const tree = await generateElement(node);
    const htmlCode = toHtml(tree || []);
    const formattedCode = await format(htmlCode, {
      parser: "html",
      plugins: [prettierPluginHtml],
      bracketSameLine: true,
    });

    // @see https://www.figma.com/plugin-docs/api/CodeBlockNode/#codelanguage
    return [
      {
        language: "HTML",
        code: formattedCode,
        title: "Formatted HTML",
      },
    ];
  });
}
