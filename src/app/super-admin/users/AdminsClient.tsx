"use client";

import { useState, useTransition } from "react";
import { 
  Button, 
  Input, 
  Select, 
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
import { createOrgAdminAction, updateOrgAdminAction, deleteOrgAdminAction } from "@/actions/saas";

type OrganizationOption = {
  _id: string;
  name: string;
};

type AdminUserItem = {
  _id: string;
  displayId: string;
  name: string;
  email: string;
  status: string;
  orgId?: string;
  orgName: string;
  createdAt: string;
};

export default function AdminsClient({ 
  admins, 
  organizations 
}: { 
  admins: AdminUserItem[]; 
  organizations: OrganizationOption[] 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgId, setOrgId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Edit Admin state
  const [editingAdmin, setEditingAdmin] = useState<AdminUserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editOrgId, setEditOrgId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgId) {
      setError("Please select an organization.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("email", email);
      formData.set("password", password);
      formData.set("orgId", orgId);

      const res = await createOrgAdminAction({ error: "" }, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setName("");
        setEmail("");
        setPassword("");
        setOrgId("");
        setIsModalOpen(false);
      }
    });
  };

  const openEditModal = (admin: AdminUserItem) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditPassword("");
    setEditOrgId(admin.orgId || "");
    setEditError(null);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", editName);
      formData.set("email", editEmail);
      formData.set("password", editPassword);
      formData.set("orgId", editOrgId);

      const res = await updateOrgAdminAction(editingAdmin._id, { error: "" }, formData);
      if (res.error) {
        setEditError(res.error);
      } else {
        setEditingAdmin(null);
      }
    });
  };

  const handleDeleteAdmin = async (admin: AdminUserItem) => {
    if (confirm(`Are you sure you want to delete admin "${admin.name}" (${admin.email})?`)) {
      const res = await deleteOrgAdminAction(admin._id);
      if (res.error) {
        alert(res.error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Admins</h1>
          <p className="text-sm text-gray-500">Manage Tenant Organization Administrator logins.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} id="btn-create-admin" disabled={organizations.length === 0}>
          Create Org Admin
        </Button>
      </div>

      {admins.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No organization admins found. {organizations.length === 0 ? "Create an Organization first to add admins." : "Click the button above to add one."}
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TH>ID</TH>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Organization</TH>
              <TH>Status</TH>
              <TH>Created At</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <tbody>
              {admins.map((admin) => (
                <TR key={admin._id}>
                  <TD className="text-gray-600 font-mono">{admin.displayId}</TD>
                  <TD className="font-semibold text-gray-900">{admin.name}</TD>
                  <TD className="text-gray-600">{admin.email}</TD>
                  <TD className="font-medium text-brand-blue">{admin.orgName}</TD>
                  <TD>
                    <Badge tone={admin.status === "active" ? "green" : "red"}>
                      {admin.status}
                    </Badge>
                  </TD>
                  <TD className="text-gray-500">{new Date(admin.createdAt).toLocaleDateString()}</TD>
                  <TD className="text-right flex items-center justify-end gap-2">
                    <Button variant="secondary" onClick={() => openEditModal(admin)} size="sm">
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDeleteAdmin(admin)} size="sm">
                      Delete
                    </Button>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      {/* Create Admin Modal */}
      <Modal 
        open={isModalOpen}
        title="Create Organization Administrator" 
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <Field label="Admin Name">
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. John Doe" 
              required 
            />
          </Field>

          <Field label="Email Address">
            <Input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="e.g. admin@acme.com" 
              required 
            />
          </Field>

          <Field label="Temporary Password">
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </Field>

          <Field label="Assign Organization">
            <Select 
              value={orgId} 
              onChange={(e) => setOrgId(e.target.value)}
              required
            >
              <option value="">Select Organization...</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Admin"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        open={!!editingAdmin}
        title="Edit Organization Administrator"
        onClose={() => setEditingAdmin(null)}
      >
        <form onSubmit={handleUpdateAdmin} className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
              {editError}
            </div>
          )}

          <Field label="Admin Name">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </Field>

          <Field label="Email Address">
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="e.g. admin@acme.com"
              required
            />
          </Field>

          <Field label="New Password" hint="Leave blank to keep existing password.">
            <Input
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="•••••••• (optional)"
            />
          </Field>

          <Field label="Assigned Organization">
            <Select
              value={editOrgId}
              onChange={(e) => setEditOrgId(e.target.value)}
              required
            >
              <option value="">Select Organization...</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setEditingAdmin(null)}>
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
