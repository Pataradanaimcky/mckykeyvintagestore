"use client";

import type { ComponentProps } from "react";
import { Fader } from "../Fader";
import { Knob } from "../Knob";

/**
 * The rack's Knob and Fader inside a named group, so a screen reader reads the Thai name (`name`)
 * with the keyboard's own word shown under the control. Tab and the arrow keys come from Knob and Fader.
 * `empty` marks a control on a PART/ZONE strip the Performance or Scene does not use (S14b): the group is
 * made inert, so it is skipped by Tab and screen readers and cannot be dragged; it still shows "—".
 */
export function SimKnob({ name, empty = false, ...props }: ComponentProps<typeof Knob> & { name: string; empty?: boolean }) {
  return (
    <span role="group" aria-label={name} className="flex flex-col items-center" inert={empty} data-empty={empty || undefined}>
      <Knob {...props} />
    </span>
  );
}

export function SimFader({ name, empty = false, ...props }: ComponentProps<typeof Fader> & { name: string; empty?: boolean }) {
  return (
    <span role="group" aria-label={name} className="flex flex-col items-center" inert={empty} data-empty={empty || undefined}>
      <Fader {...props} />
    </span>
  );
}
