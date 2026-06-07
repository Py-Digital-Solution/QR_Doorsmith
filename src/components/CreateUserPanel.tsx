"use client";

import { useState } from "react";
import { SlideOver } from "./SlideOver";
import { CreateUserForm } from "@/app/admin/users/CreateUserForm";
import type { UserRole } from "@/models/User";

/**
 * "+ Create" button that opens a right-side slide-over with the create form.
 * Closes automatically when a user is created successfully.
 */
export function CreateUserPanel({
  allowedRoles,
  label = "Create user",
  title = "Create user",
}: {
  allowedRoles: UserRole[];
  label?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
      >
        + {label}
      </button>

      <SlideOver open={open} onClose={() => setOpen(false)} title={title}>
        <CreateUserForm
          allowedRoles={allowedRoles}
          onSuccess={() => setOpen(false)}
        />
      </SlideOver>
    </>
  );
}
