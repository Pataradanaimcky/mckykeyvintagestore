/**
 * Audio demos recorded by the owner from his own keyboard, one per patch.
 *
 * To add one: put the file in /public/demos/<pack slug>/ (MP3 or M4A, 15–30
 * seconds, a loop that can repeat), then add a line below, e.g.
 *   "thai-pop-keys-vol-1/Sukhumvit EP": "/demos/thai-pop-keys-vol-1/sukhumvit-ep.m4a",
 * The demo page plays these through the browser's audio engine with no
 * download link. Patches without a recording play a close-match preview,
 * clearly labelled as not the real sound.
 */
export const demoClips: Record<string, string> = {};

export const clipFor = (slug: string, patchName: string) => demoClips[`${slug}/${patchName}`];
