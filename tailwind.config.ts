import type { Config } from "tailwindcss"

export default {
  theme: {
    extend: {
      borderRadius: {
        none: "0px",
        xs: "3px",
        sm: "3px",
        md: "3px", // buttons, inputs, dropdowns
        lg: "3px", // cards, panels ← main workhorse
        xl: "3px", // modals, dialogs
        "2xl": "3px", // large containers
        full: "9999px", // pills, tags, badges
      },
    },
  },
} satisfies Config

