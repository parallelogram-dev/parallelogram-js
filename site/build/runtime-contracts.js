/**
 * What the site's runtime needs from a contract: how to find and load a component, and which
 * events and state attributes the playground watches. Everything else -- descriptions, examples,
 * properties, custom properties -- is documentation, rendered to the pages at build time, and was
 * shipping to every visitor as 37 kB of JavaScript for the sake of these fields.
 */
const item = ({ name, kind, module, tag, selector, match, events, attributes, elements }) =>
  JSON.parse(
    JSON.stringify({
      name,
      kind,
      module,
      tag,
      selector,
      match,
      events: (events ?? []).map(({ name, channel, inbound, deprecated }) => ({
        name,
        channel,
        inbound,
        deprecated,
      })),
      attributes: (attributes ?? [])
        .filter(attribute => attribute.readonly)
        .map(({ name, readonly, deprecated }) => ({ name, readonly, deprecated })),
      elements: (elements ?? []).map(item),
    })
  );

/**
 * @param {object[]} contracts
 * @returns {object[]}
 */
export const runtimeContracts = contracts => contracts.map(item);
