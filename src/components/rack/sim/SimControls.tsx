"use client";

import type { ComponentProps } from "react";
import { Fader } from "../Fader";
import { Knob } from "../Knob";

/**
 * The rack's Knob and Fader inside a named group, so a screen reader reads the Thai name (`name`)
 * with the keyboard's own word shown under the control. Tab and the arrow keys come from Knob and Fader.
 */
export function SimKnob({ name, ...props }: ComponentProps<typeof Knob> & { name: string }) {
  return (
    <span role="group" aria-label={name} className="flex flex-col items-center">
      <Knob {...props} />
    </span>
  );
}

export function SimFader({ name, ...props }: ComponentProps<typeof Fader> & { name: string }) {
  return (
    <span role="group" aria-label={name} className="flex flex-col items-center">
      <Fader {...props} />
    </span>
  );
}
