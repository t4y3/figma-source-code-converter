/**
 * Retrieves the fill images for a given node.
 *
 * @param {SceneNode} node - The node to retrieve fill images from.
 * @returns {Promise<Array<Object>>|null} - An array of objects representing the fill images,
 *    where each object contains the image bytes and size, or null if no fill images are found.
 */
export const getFillImage = async (
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
