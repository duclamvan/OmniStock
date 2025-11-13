import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, Package, Calendar, User, ShoppingCart, 
  RefreshCw, MessageSquare, Truck, Hash, Edit, Printer, Share2, Check 
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function ReturnDetails() {
  const [, navigate] = useLocation();
  const { id } = useParams();

  const { data: returnData, isLoading, error } = useQuery<any>({
    queryKey: [`/api/returns/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !returnData) {
    return null;
  }

  const statusColors: Record<string, string> = {
    'awaiting': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const typeColors: Record<string, string> = {
    'exchange': 'bg-blue-100 text-blue-800',
    'refund': 'bg-green-100 text-green-800',
    'store_credit': 'bg-purple-100 text-purple-800',
  };

  const totalItems = returnData.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
  const totalValue = returnData.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Returns
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Return Details</h1>
          <p className="text-gray-600">Return ID: {returnData.returnId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Link href={`/returns/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status and Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge className={`mt-2 ${statusColors[returnData.status] || 'bg-gray-100 text-gray-800'}`}>
                  {returnData.status?.charAt(0).toUpperCase() + returnData.status?.slice(1)}
                </Badge>
              </div>
              <RefreshCw className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Return Type</p>
                <Badge className={`mt-2 ${typeColors[returnData.returnType] || 'bg-gray-100 text-gray-800'}`}>
                  {returnData.returnType?.replace('_', ' ').split(' ').map((word: string) => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Badge>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">€{totalValue.toFixed(2)}</p>
              </div>
              <Hash className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Return Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Return Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Return Date</p>
                <p className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {format(new Date(returnData.returnDate), 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="mt-1">
                  {format(new Date(returnData.createdAt), 'dd MMM yyyy')}
                </p>
              </div>
            </div>

            {returnData.orderId && (
              <div>
                <p className="text-sm font-medium text-gray-600">Order Number</p>
                <Link href={`/orders/${returnData.orderId}`}>
                  <p className="flex items-center mt-1 text-blue-600 hover:text-blue-800 cursor-pointer">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {returnData.order?.id.slice(0, 8).toUpperCase()}
                  </p>
                </Link>
              </div>
            )}

            {returnData.shippingCarrier && (
              <div>
                <p className="text-sm font-medium text-gray-600">Shipping Carrier</p>
                <p className="flex items-center mt-1">
                  <Truck className="h-4 w-4 mr-2 text-gray-400" />
                  {returnData.shippingCarrier.toUpperCase()}
                </p>
              </div>
            )}

            {returnData.notes && (
              <div>
                <p className="text-sm font-medium text-gray-600">Notes</p>
                <p className="flex items-start mt-1">
                  <MessageSquare className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                  <span className="text-gray-700">{returnData.notes}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {returnData.customer ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <Link href={`/customers/${returnData.customerId}`}>
                    <p className="flex items-center mt-1 text-blue-600 hover:text-blue-800 cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      {returnData.customer.name}
                    </p>
                  </Link>
                </div>
                {returnData.customer.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="mt-1">{returnData.customer.email}</p>
                  </div>
                )}
                {returnData.customer.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Phone</p>
                    <p className="mt-1">{returnData.customer.phone}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">No customer information</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Returned */}
      <Card>
        <CardHeader>
          <CardTitle>Items Returned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Product</th>
                  <th className="text-left py-3 px-4">SKU</th>
                  <th className="text-right py-3 px-4">Quantity</th>
                  <th className="text-right py-3 px-4">Price</th>
                  <th className="text-right py-3 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {returnData.items?.map((item: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4">
                      {item.product ? (
                        <Link href={`/products/${item.productId}`}>
                          <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
                            {item.productName}
                          </span>
                        </Link>
                      ) : (
                        <span>{item.productName}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm">{item.sku || '-'}</span>
                    </td>
                    <td className="text-right py-3 px-4">{item.quantity}</td>
                    <td className="text-right py-3 px-4">€{parseFloat(item.price).toFixed(2)}</td>
                    <td className="text-right py-3 px-4 font-medium">
                      €{(item.quantity * parseFloat(item.price)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right py-3 px-4 font-medium">
                    Total
                  </td>
                  <td className="text-right py-3 px-4 font-bold text-lg">
                    €{totalValue.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Return Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="font-medium">Return Created</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(returnData.createdAt), 'dd MMM yyyy, HH:mm')}
                </p>
              </div>
            </div>
            
            {returnData.status === 'processing' && (
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="font-medium">Processing</p>
                  <p className="text-sm text-gray-600">Return is being processed</p>
                </div>
              </div>
            )}
            
            {returnData.status === 'completed' && (
              <div className="flex items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="font-medium">Completed</p>
                  <p className="text-sm text-gray-600">
                    Return has been completed
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}