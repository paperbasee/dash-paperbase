import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-head"
      className={cn("border-b border-border bg-muted/40", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("divide-y divide-border", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "transition-colors hover:bg-muted/30 data-[selected=true]:bg-muted/50",
        className
      )}
      {...props}
    />
  )
}

function Th({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="th"
      className={cn("th text-left", className)}
      {...props}
    />
  )
}

function Td({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="td"
      className={cn("td", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border bg-muted/20 font-medium", className)}
      {...props}
    />
  )
}

export { Table, TableHead, TableBody, TableRow, Th, Td, TableFooter }
