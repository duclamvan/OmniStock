import { db } from "../db";
import { roles, permissions, rolePermissions } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_PERMISSIONS = [
  { parentSection: 'warehouse_operations', section: 'dashboard', page: 'view', path: '/dashboard', displayName: 'View Dashboard', displayNameVi: 'Xem tổng quan', sortOrder: 1, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'orders', page: 'view', path: '/orders', displayName: 'View Orders', displayNameVi: 'Xem đơn hàng', sortOrder: 10, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'orders', page: 'create', path: '/orders/new', displayName: 'Create Orders', displayNameVi: 'Tạo đơn hàng', sortOrder: 11, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'orders', page: 'edit', path: '/orders/:id/edit', displayName: 'Edit Orders', displayNameVi: 'Sửa đơn hàng', sortOrder: 12, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'orders', page: 'delete', path: '/orders/:id/delete', displayName: 'Delete Orders', displayNameVi: 'Xóa đơn hàng', sortOrder: 13, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'orders', page: 'pick_pack', path: '/orders/:id/pick-pack', displayName: 'Pick & Pack Orders', displayNameVi: 'Lấy & đóng gói', sortOrder: 14, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'inventory', page: 'view', path: '/inventory', displayName: 'View Inventory', displayNameVi: 'Xem tồn kho', sortOrder: 20, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'inventory', page: 'create', path: '/inventory/new', displayName: 'Create Products', displayNameVi: 'Tạo sản phẩm', sortOrder: 21, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'inventory', page: 'edit', path: '/inventory/:id/edit', displayName: 'Edit Products', displayNameVi: 'Sửa sản phẩm', sortOrder: 22, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'inventory', page: 'delete', path: '/inventory/:id/delete', displayName: 'Delete Products', displayNameVi: 'Xóa sản phẩm', sortOrder: 23, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'inventory', page: 'adjust', path: '/inventory/:id/adjust', displayName: 'Adjust Inventory', displayNameVi: 'Điều chỉnh tồn kho', sortOrder: 24, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'stock', page: 'view', path: '/stock', displayName: 'View Stock', displayNameVi: 'Xem kho', sortOrder: 30, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'stock', page: 'transfer', path: '/stock/transfer', displayName: 'Transfer Stock', displayNameVi: 'Chuyển kho', sortOrder: 31, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'stock', page: 'adjust', path: '/stock/adjust', displayName: 'Stock Adjustments', displayNameVi: 'Điều chỉnh kho', sortOrder: 32, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'warehouses', page: 'view', path: '/warehouses', displayName: 'View Warehouses', displayNameVi: 'Xem kho hàng', sortOrder: 40, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'warehouses', page: 'manage', path: '/warehouses/manage', displayName: 'Manage Warehouses', displayNameVi: 'Quản lý kho hàng', sortOrder: 41, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'warehouses', page: 'map', path: '/warehouses/map', displayName: 'Warehouse Map', displayNameVi: 'Bản đồ kho', sortOrder: 42, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'manufacturing', page: 'view', path: '/manufacturing', displayName: 'View Manufacturing', displayNameVi: 'Xem sản xuất', sortOrder: 50, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'manufacturing', page: 'create', path: '/manufacturing/new', displayName: 'Create Production', displayNameVi: 'Tạo sản xuất', sortOrder: 51, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'manufacturing', page: 'convert', path: '/manufacturing/simple-conversion', displayName: 'Simple Conversion', displayNameVi: 'Chuyển đổi đơn giản', sortOrder: 52, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'pos', page: 'view', path: '/pos', displayName: 'Point of Sale', displayNameVi: 'Bán hàng', sortOrder: 60, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'pos', page: 'process', path: '/pos/sale', displayName: 'Process Sales', displayNameVi: 'Xử lý bán hàng', sortOrder: 61, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'pos', page: 'refund', path: '/pos/refund', displayName: 'Process Refunds', displayNameVi: 'Xử lý hoàn tiền', sortOrder: 62, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'customers', page: 'view', path: '/customers', displayName: 'View Customers', displayNameVi: 'Xem khách hàng', sortOrder: 70, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'customers', page: 'create', path: '/customers/new', displayName: 'Create Customers', displayNameVi: 'Tạo khách hàng', sortOrder: 71, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'customers', page: 'edit', path: '/customers/:id/edit', displayName: 'Edit Customers', displayNameVi: 'Sửa khách hàng', sortOrder: 72, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'customers', page: 'delete', path: '/customers/:id/delete', displayName: 'Delete Customers', displayNameVi: 'Xóa khách hàng', sortOrder: 73, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'customers', page: 'pricing', path: '/customers/:id/pricing', displayName: 'Customer Pricing', displayNameVi: 'Giá khách hàng', sortOrder: 74, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'discounts', page: 'view', path: '/discounts', displayName: 'View Discounts', displayNameVi: 'Xem giảm giá', sortOrder: 80, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'discounts', page: 'create', path: '/discounts/new', displayName: 'Create Discounts', displayNameVi: 'Tạo giảm giá', sortOrder: 81, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'discounts', page: 'edit', path: '/discounts/:id/edit', displayName: 'Edit Discounts', displayNameVi: 'Sửa giảm giá', sortOrder: 82, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'discounts', page: 'delete', path: '/discounts/:id/delete', displayName: 'Delete Discounts', displayNameVi: 'Xóa giảm giá', sortOrder: 83, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'imports', page: 'view', path: '/imports', displayName: 'View Imports', displayNameVi: 'Xem nhập hàng', sortOrder: 90, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'imports', page: 'create', path: '/imports/new', displayName: 'Create Shipments', displayNameVi: 'Tạo lô hàng', sortOrder: 91, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'imports', page: 'edit', path: '/imports/:id/edit', displayName: 'Edit Shipments', displayNameVi: 'Sửa lô hàng', sortOrder: 92, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'imports', page: 'costs', path: '/imports/:id/costs', displayName: 'View Import Costs', displayNameVi: 'Xem chi phí nhập', sortOrder: 93, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'receiving', page: 'view', path: '/receiving', displayName: 'View Receiving', displayNameVi: 'Xem nhận hàng', sortOrder: 100, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'receiving', page: 'process', path: '/receiving/process', displayName: 'Process Receiving', displayNameVi: 'Xử lý nhận hàng', sortOrder: 101, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'files', page: 'view', path: '/files', displayName: 'View Files', displayNameVi: 'Xem tệp', sortOrder: 110, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'files', page: 'upload', path: '/files/upload', displayName: 'Upload Files', displayNameVi: 'Tải lên tệp', sortOrder: 111, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'files', page: 'delete', path: '/files/:id/delete', displayName: 'Delete Files', displayNameVi: 'Xóa tệp', sortOrder: 112, isSensitive: true },
  { parentSection: 'warehouse_operations', section: 'services', page: 'view', path: '/services', displayName: 'View Services', displayNameVi: 'Xem dịch vụ', sortOrder: 120, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'services', page: 'create', path: '/services/new', displayName: 'Create Services', displayNameVi: 'Tạo dịch vụ', sortOrder: 121, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'tickets', page: 'view', path: '/tickets', displayName: 'View Tickets', displayNameVi: 'Xem yêu cầu', sortOrder: 130, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'tickets', page: 'create', path: '/tickets/new', displayName: 'Create Tickets', displayNameVi: 'Tạo yêu cầu', sortOrder: 131, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'tickets', page: 'resolve', path: '/tickets/:id/resolve', displayName: 'Resolve Tickets', displayNameVi: 'Giải quyết yêu cầu', sortOrder: 132, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'returns', page: 'view', path: '/returns', displayName: 'View Returns', displayNameVi: 'Xem trả hàng', sortOrder: 140, isSensitive: false },
  { parentSection: 'warehouse_operations', section: 'returns', page: 'process', path: '/returns/process', displayName: 'Process Returns', displayNameVi: 'Xử lý trả hàng', sortOrder: 141, isSensitive: false },
  { parentSection: 'administration', section: 'employees', page: 'view', path: '/employees', displayName: 'View Employees', displayNameVi: 'Xem nhân viên', sortOrder: 200, isSensitive: false },
  { parentSection: 'administration', section: 'employees', page: 'manage', path: '/employees/manage', displayName: 'Manage Employees', displayNameVi: 'Quản lý nhân viên', sortOrder: 201, isSensitive: true },
  { parentSection: 'administration', section: 'reports', page: 'view', path: '/reports', displayName: 'View Reports', displayNameVi: 'Xem báo cáo', sortOrder: 210, isSensitive: false },
  { parentSection: 'administration', section: 'reports', page: 'financial', path: '/reports/financial', displayName: 'Financial Reports', displayNameVi: 'Báo cáo tài chính', sortOrder: 211, isSensitive: true },
  { parentSection: 'administration', section: 'reports', page: 'export', path: '/reports/export', displayName: 'Export Reports', displayNameVi: 'Xuất báo cáo', sortOrder: 212, isSensitive: true },
  { parentSection: 'administration', section: 'settings', page: 'view', path: '/settings', displayName: 'View Settings', displayNameVi: 'Xem cài đặt', sortOrder: 220, isSensitive: false },
  { parentSection: 'administration', section: 'settings', page: 'system', path: '/settings/system', displayName: 'System Settings', displayNameVi: 'Cài đặt hệ thống', sortOrder: 221, isSensitive: true },
  { parentSection: 'administration', section: 'settings', page: 'users', path: '/settings/users', displayName: 'User Management', displayNameVi: 'Quản lý người dùng', sortOrder: 222, isSensitive: true },
  { parentSection: 'administration', section: 'settings', page: 'roles', path: '/settings/roles', displayName: 'Role Management', displayNameVi: 'Quản lý vai trò', sortOrder: 223, isSensitive: true },
];

const DEFAULT_ROLES = [
  {
    id: 'admin-role-001',
    name: 'administrator',
    displayName: 'Administrator',
    displayNameVi: 'Quản trị viên',
    description: 'Full system access with all permissions',
    descriptionVi: 'Toàn quyền truy cập hệ thống với tất cả quyền hạn',
    type: 'system',
    isSystem: true,
    color: 'red',
    icon: 'Shield',
  },
  {
    id: 'manager-role-001',
    name: 'manager',
    displayName: 'Manager',
    displayNameVi: 'Quản lý',
    description: 'Full warehouse access plus reports and employee management',
    descriptionVi: 'Toàn quyền kho hàng cộng với báo cáo và quản lý nhân viên',
    type: 'system',
    isSystem: true,
    color: 'green',
    icon: 'UserCog',
  },
  {
    id: 'staff-role-001',
    name: 'warehouse_staff',
    displayName: 'Warehouse Staff',
    displayNameVi: 'Nhân viên kho',
    description: 'Basic warehouse operations - orders, inventory, pick & pack',
    descriptionVi: 'Vận hành kho cơ bản - đơn hàng, tồn kho, lấy & đóng gói',
    type: 'system',
    isSystem: true,
    color: 'blue',
    icon: 'Package',
  },
];

export async function seedDefaultRolesAndPermissions(): Promise<void> {
  try {
    // Check if tables exist and have the expected columns before proceeding
    // This prevents errors if the schema is different in production
    let existingRoles: any[] = [];
    let existingPermissions: any[] = [];
    let existingRolePermissions: any[] = [];
    
    try {
      existingRoles = await db.select().from(roles);
      existingPermissions = await db.select().from(permissions);
      existingRolePermissions = await db.select().from(rolePermissions);
    } catch (tableError) {
      // Tables might not exist or have different schema - silently skip seeding
      console.log('[Seed] Skipping - tables not ready or schema mismatch');
      return;
    }

    let seededSomething = false;

    if (existingPermissions.length === 0) {
      try {
        console.log('[Seed] Seeding default permissions...');
        for (const perm of DEFAULT_PERMISSIONS) {
          await db.insert(permissions).values(perm).onConflictDoNothing();
        }
        console.log(`[Seed] Created ${DEFAULT_PERMISSIONS.length} permissions`);
        seededSomething = true;
      } catch (permError) {
        console.log('[Seed] Could not seed permissions, continuing...');
      }
    }

    if (existingRoles.length === 0) {
      try {
        console.log('[Seed] Seeding default roles...');
        for (const role of DEFAULT_ROLES) {
          await db.insert(roles).values(role).onConflictDoNothing();
        }
        console.log(`[Seed] Created ${DEFAULT_ROLES.length} roles`);
        seededSomething = true;
      } catch (roleError) {
        console.log('[Seed] Could not seed roles, continuing...');
      }
    }

    try {
      const allPermissions = await db.select().from(permissions);
      const allRoles = await db.select().from(roles);
      const currentRolePermissions = await db.select().from(rolePermissions);

      for (const role of DEFAULT_ROLES) {
        const dbRole = allRoles.find(r => r.name === role.name);
        if (!dbRole) continue;

        const existingPermsForRole = currentRolePermissions.filter(rp => rp.roleId === dbRole.id);
        
        if (existingPermsForRole.length === 0) {
          let permissionsToAssign: typeof allPermissions = [];

          if (role.name === 'administrator') {
            permissionsToAssign = allPermissions;
          } else if (role.name === 'manager') {
            permissionsToAssign = allPermissions.filter(
              p => p.parentSection === 'warehouse_operations' || 
                   p.section === 'reports' || 
                   p.section === 'employees'
            );
          } else if (role.name === 'warehouse_staff') {
            permissionsToAssign = allPermissions.filter(
              p => p.parentSection === 'warehouse_operations' && !p.isSensitive
            );
          }

          if (permissionsToAssign.length > 0) {
            for (const perm of permissionsToAssign) {
              await db.insert(rolePermissions).values({
                id: crypto.randomUUID(),
                roleId: dbRole.id,
                permissionId: perm.id,
              }).onConflictDoNothing();
            }
            console.log(`[Seed] Assigned ${permissionsToAssign.length} permissions to ${role.name}`);
            seededSomething = true;
          }
        }
      }
    } catch (assignError) {
      console.log('[Seed] Could not assign role permissions, continuing...');
    }

    if (seededSomething) {
      console.log('[Seed] Default roles and permissions seeded successfully');
    } else {
      console.log('[Seed] Roles and permissions already exist, skipping seed');
    }
  } catch (error) {
    // Completely silent failure - seeding is non-critical
    console.log('[Seed] Seeding skipped due to error');
  }
}
