/**
 * A stand-in server for the documentation site's examples, so uploads and saves work on a static host
 */

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const json = body =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const slug = text =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Towns and suburbs around Australia, listed as `Name, STATE`, for the long list example */
const PLACES = [
  'Sydney, NSW',
  'Newcastle, NSW',
  'Wollongong, NSW',
  'Parramatta, NSW',
  'Bondi, NSW',
  'Manly, NSW',
  'Cronulla, NSW',
  'Chatswood, NSW',
  'Penrith, NSW',
  'Surry Hills, NSW',
  'Newtown, NSW',
  'Katoomba, NSW',
  'Bathurst, NSW',
  'Orange, NSW',
  'Dubbo, NSW',
  'Tamworth, NSW',
  'Armidale, NSW',
  'Coffs Harbour, NSW',
  'Byron Bay, NSW',
  'Wagga Wagga, NSW',
  'Albury, NSW',
  'Goulburn, NSW',
  'Maitland, NSW',
  'Nowra, NSW',
  'Broken Hill, NSW',
  'Melbourne, VIC',
  'Fitzroy, VIC',
  'St Kilda, VIC',
  'Brunswick, VIC',
  'Richmond, VIC',
  'Footscray, VIC',
  'Geelong, VIC',
  'Ballarat, VIC',
  'Bendigo, VIC',
  'Shepparton, VIC',
  'Warrnambool, VIC',
  'Dandenong, VIC',
  'Frankston, VIC',
  'Mildura, VIC',
  'Wodonga, VIC',
  'Traralgon, VIC',
  'Horsham, VIC',
  'Sale, VIC',
  'Torquay, VIC',
  'Castlemaine, VIC',
  'Brisbane, QLD',
  'Fortitude Valley, QLD',
  'Ipswich, QLD',
  'Gold Coast, QLD',
  'Caloundra, QLD',
  'Noosa Heads, QLD',
  'Toowoomba, QLD',
  'Gympie, QLD',
  'Bundaberg, QLD',
  'Hervey Bay, QLD',
  'Maryborough, QLD',
  'Gladstone, QLD',
  'Rockhampton, QLD',
  'Mackay, QLD',
  'Airlie Beach, QLD',
  'Townsville, QLD',
  'Charters Towers, QLD',
  'Cairns, QLD',
  'Mount Isa, QLD',
  'Roma, QLD',
  'Adelaide, SA',
  'Glenelg, SA',
  'Norwood, SA',
  'Murray Bridge, SA',
  'Victor Harbor, SA',
  'Mount Gambier, SA',
  'Renmark, SA',
  'Port Augusta, SA',
  'Port Lincoln, SA',
  'Whyalla, SA',
  'Perth, WA',
  'Fremantle, WA',
  'Mandurah, WA',
  'Bunbury, WA',
  'Busselton, WA',
  'Albany, WA',
  'Esperance, WA',
  'Kalgoorlie, WA',
  'Geraldton, WA',
  'Karratha, WA',
  'Port Hedland, WA',
  'Broome, WA',
  'Hobart, TAS',
  'Kingston, TAS',
  'Sorell, TAS',
  'Launceston, TAS',
  'Devonport, TAS',
  'Burnie, TAS',
  'Ulverstone, TAS',
  'Darwin, NT',
  'Palmerston, NT',
  'Katherine, NT',
  'Nhulunbuy, NT',
  'Alice Springs, NT',
  'Canberra, ACT',
  'Belconnen, ACT',
  'Gungahlin, ACT',
  'Tuggeranong, ACT',
  'Woden, ACT',
];

const PLACE_OPTIONS = PLACES.map(place => ({ value: slug(place), label: place }));

const GIVEN_NAMES = [
  'Amelia',
  'Noah',
  'Charlotte',
  'Oliver',
  'Isla',
  'Leo',
  'Matilda',
  'Hudson',
  'Ruby',
  'Archie',
  'Georgia',
  'Xavier',
  'Harriet',
  'Jarrah',
  'Priya',
  'Mateo',
  'Nadia',
  'Elias',
  'Frances',
  'Tobias',
  'Saoirse',
  'Malik',
  'Imogen',
  'Callum',
];

const FAMILY_NAMES = [
  'Nguyen',
  'Whitlam',
  'Papadopoulos',
  'O’Sullivan',
  'Tran',
  'Callaghan',
  'Mikkelsen',
  'Rahman',
  'Ferraro',
  'Baptiste',
  'Kowalski',
  'Hargreaves',
  'Yunupingu',
  'Petrenko',
];

const ROLES = [
  'Owner, Harbourside Bistro',
  'Buyer, Southern Grocers',
  'Events manager, The Terrace',
  'Head chef, Kitchen Table',
  'Accounts, Riverbend Farms',
  'Sommelier, Vine & Barrel',
  'Director, Coastal Catering',
];

/**
 * A directory of a few hundred people, built from the same name lists in the same order on every
 * load, so a row keeps its id between reloads. Each row carries an email as its secondary text and
 * a role as its description, so the select shows both
 */
const DIRECTORY = GIVEN_NAMES.flatMap((given, index) =>
  FAMILY_NAMES.map((family, offset) => {
    const row = index * FAMILY_NAMES.length + offset;
    return {
      value: `cust-${4200 + row}`,
      label: `${given} ${family} — ${PLACES[row % PLACES.length]}`,
      secondary: `${slug(given)}.${slug(family)}@example.com`,
      description: ROLES[row % ROLES.length],
    };
  })
);

/* The label and the secondary text are searched, as the select searches them itself */
const matches = (options, query) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return options;
  return options.filter(
    option =>
      option.label.toLowerCase().includes(needle) ||
      option.secondary?.toLowerCase().includes(needle)
  );
};

/**
 * Answer the site's JSON requests: `/api/update`, `/api/delete` and `/api/sequence` for the
 * uploader, `/api/places` and `/api/directory` for the select. Every other request goes to the
 * network. The delays are there so the examples show their loading states.
 */
export function installMockApi() {
  if (window.fetch.isMockApi) return;

  const networkFetch = window.fetch.bind(window);
  const mockFetch = async (resource, options) => {
    const url = new URL(
      resource instanceof Request ? resource.url : String(resource),
      location.href
    );
    const query = url.searchParams.get('q') ?? '';

    if (/\/api\/(update|delete|sequence)$/.test(url.pathname)) {
      await delay(400);
      return json({ success: true });
    }

    if (/\/api\/places$/.test(url.pathname)) {
      await delay(250);
      return json({ options: matches(PLACE_OPTIONS, query) });
    }

    /* A stand-in for a database search: it never sends more than a page of rows back */
    if (/\/api\/directory$/.test(url.pathname)) {
      await delay(450);
      return json({ options: matches(DIRECTORY, query).slice(0, 25) });
    }

    return networkFetch(resource, options);
  };

  mockFetch.isMockApi = true;
  window.fetch = mockFetch;
}

/**
 * An XMLHttpRequest stand-in that reports upload progress and answers with the file's preview
 *
 * Files with "fail" in their name are refused, to show how the uploader reports errors.
 */
export class MockUpload {
  upload = new EventTarget();
  #events = new EventTarget();
  status = 0;
  responseText = '';
  aborted = false;

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader() {}

  addEventListener(type, listener) {
    this.#events.addEventListener(type, listener);
  }

  abort() {
    this.aborted = true;
    this.#events.dispatchEvent(new Event('abort'));
  }

  async send(body) {
    const file =
      body instanceof FormData ? [...body.values()].find(value => value instanceof File) : null;

    for (let step = 1; step <= 10; step++) {
      await delay(120);
      if (this.aborted) return;
      this.upload.dispatchEvent(
        new ProgressEvent('progress', { lengthComputable: true, loaded: step, total: 10 })
      );
    }

    if (!file || /fail/i.test(file.name)) {
      this.status = 422;
      this.responseText = JSON.stringify({ message: 'The server refused this file' });
    } else {
      this.status = 200;
      this.responseText = JSON.stringify({
        id: `upload-${crypto.randomUUID()}`,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      });
    }
    this.#events.dispatchEvent(new Event('load'));
  }
}
