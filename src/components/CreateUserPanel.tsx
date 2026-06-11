"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SlideOver } from "./SlideOver";
import { Button } from "./ui/Button";
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
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        {label}
      </Button>

      <SlideOver open={open} onClose={() => setOpen(false)} title={title}>
        <CreateUserForm
          allowedRoles={allowedRoles}
          onSuccess={() => setOpen(false)}
        />
      </SlideOver>
    </>
  );
}
