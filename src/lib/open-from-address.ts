/**
 * What a list page's address may ask it to open (hooks/useOpenFromAddress): `?open=<public id>`
 * for one thing -- how a search result reaches something with no page of its own -- or
 * `?open=new` for the page's own add form, blank -- how the sidebar's Add new menu reaches a page
 * that adds in place (config/quick-create.ts). No public id is ever "new".
 */
export const OPEN_PARAM = "open";

export const OPEN_NEW = "new";
