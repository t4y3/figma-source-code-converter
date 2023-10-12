/**
 * Generates an object containing the prop types for a component based on the given property definitions.
 *
 * @see https://www.figma.com/plugin-docs/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/
 * @param {ComponentPropertyDefinitions} definitions - The property definitions for the component.
 * @returns {Object} - An object containing the prop types with keys representing the property names and values representing the types.
 */
export const generatePropsTypeFromComponentPropertyDefinitions = (
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
