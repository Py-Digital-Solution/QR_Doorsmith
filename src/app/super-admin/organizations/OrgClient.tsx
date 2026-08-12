"use client";

import { useState, useTransition } from "react";
import { 
  Button, 
  Input, 
  Field, 
  Modal, 
  TableWrapper, 
  Table, 
  THead, 
  TH, 
  TR, 
  TD, 
  Badge 
} from "@/components/ui";
import { createOrganizationAction, toggleOrganizationStatusAction, updateOrganizationAction, deleteOrganizationAction } from "@/actions/saas";

type OrganizationItem = {
  _id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
};

export default function OrgClient({ orgs }: { orgs: OrganizationItem[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Edit Org state
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("slug", slug);
      
      const res = await createOrganizationAction({ error: "" }, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setName("");
        setSlug("");
        setIsModalOpen(false);
      }
    });
  };

  const openEditModal = (org: OrganizationItem) => {
    setEditingOrg(org);
    setEditName(org.name);
    setEditSlug(org.slug);
    setEditError(null);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setEditError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", editName);
      formData.set("slug", editSlug);

      const res = await updateOrganizationAction(editingOrg._id, { error: "" }, formData);
      if (res.error) {
        setEditError(res.error);
      } else {
        setEditingOrg(null);
      }
    });
  };

  const handleDeleteOrg = async (org: OrganizationItem) => {
    if (confirm(`Are you sure you want to delete "${org.name}"? All associated users under this organization will also be removed!`)) {
      const res = await deleteOrganizationAction(org._id);
      if (res.error) {
        alert(res.error);
      }
    }
  };

  const handleToggleStatus = async (orgId: string) => {
    if (confirm("Are you sure you want to change the status of this organization?")) {
      const res = await toggleOrganizationStatusAction(orgId);
      if (res.error) {
        alert(res.error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500">Manage SaaS client tenants and their access.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} id="btn-create-org">
          Create Organization
        </Button>
      </div>

      {orgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No organizations found. Click the button above to create one.
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TH>Name</TH>
              <TH>Slug</TH>
              <TH>Status</TH>
              <TH>Created At</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <tbody>
              {orgs.map((org) => (
                <TR key={org._id}>
                  <TD className="font-semibold text-gray-900">{org.name}</TD>
                  <TD className="text-gray-600 font-mono text-xs">{org.slug}</TD>
                  <TD>
                    <Badge tone={org.status === "active" ? "green" : "red"}>
                      {org.status}
                    </Badge>
                  </TD>
                  <TD className="text-gray-500">{new Date(org.createdAt).toLocaleDateString()}</TD>
                  <TD className="text-right flex items-center justify-end gap-2">
                    <a
                      href={`/org/${org.slug}/login`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline font-medium px-2 py-1"
                    >
                      Login Page ↗
                    </a>
                    <Button variant="secondary" onClick={() => openEditModal(org)} size="sm">
                      Edit
                    </Button>
                    <Button
                      variant={org.status === "active" ? "danger" : "primary"}
                      onClick={() => handleToggleStatus(org._id)}
                      size="sm"
                    >
                      {org.status === "active" ? "Suspend" : "Activate"}
                    </Button>
                    <Button variant="danger" onClick={() => handleDeleteOrg(org)} size="sm">
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      {/* Create Modal */}
      <Modal 
        open={isModalOpen}
        title="Create Organization" 
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleCreateOrg} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}
          
          <Field label="Organization Name">
            <Input 
              value={name} 
              onChange={(e) => handleNameChange(e.target.value)} 
              placeholder="e.g. Acme Corp" 
              required 
            />
          </Field>

          <Field label="URL Slug" hint="Must be lowercase with only letters, numbers, and hyphens.">
            <Input 
              value={slug} 
              onChange={(e) => setSlug(e.target.value.toLowerCase())} 
              placeholder="e.g. acme-corp" 
              required 
            />
          </Field>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingOrg}
        title="Edit Organization"
        onClose={() => setEditingOrg(null)}
      >
        <form onSubmit={handleUpdateOrg} className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {editError}
            </div>
          )}

          <Field label="Organization Name">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
            />
          </Field>

          <Field label="URL Slug">
            <Input
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
              placeholder="e.g. acme-corp"
              required
            />
          </Field>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setEditingOrg(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
