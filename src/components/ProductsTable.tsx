import type { ProductDTO } from "@/services/products";
import { ProductActions } from "./ProductActions";

export function ProductsTable({ products }: { products: ProductDTO[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-gray-500">No products yet.</p>;
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{p.name}</span>
              <span
                className={p.status === "active" ? "text-green-600" : "text-gray-500"}
              >
                {p.status}
              </span>
            </div>
            <p className="font-mono text-xs text-gray-500">{p.sku}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>MRP ₹{p.mrp}</span>
              <span>Sales ₹{p.salesPrice}</span>
              <span className="font-medium text-brand-dark">{p.rewardPoints} pts</span>
            </div>
            <div className="mt-2 flex justify-end">
              <ProductActions product={p} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 text-right">MRP</th>
              <th className="px-4 py-2 text-right">Sales</th>
              <th className="px-4 py-2 text-right">Points</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-right">₹{p.mrp}</td>
                <td className="px-4 py-2 text-right">₹{p.salesPrice}</td>
                <td className="px-4 py-2 text-right font-medium text-brand-dark">
                  {p.rewardPoints}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      p.status === "active" ? "text-green-600" : "text-gray-500"
                    }
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <ProductActions product={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
