'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getInvoice, updateInvoice } from '@/lib/invoices-api';
import { getLogistics, updateLogistics, createLogistics } from '@/lib/logistics-api';

interface LogisticsData {
  id?: string;
  invoice_id: string;
  shipping_type: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  shipping_cost: number;
  handling_cost: number;
  insurance_cost: number;
  courier_service: string;
  tracking_number: string;
  estimated_delivery: string;
  special_instructions: string;
  packaging_notes: string;
  created_at?: string;
  updated_at?: string;
}

export default function EditLogisticsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [logistics, setLogistics] = useState<LogisticsData>({
    invoice_id: invoiceId,
    shipping_type: 'standard',
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    shipping_country: 'UK',
    shipping_cost: 0,
    handling_cost: 0,
    insurance_cost: 0,
    courier_service: '',
    tracking_number: '',
    estimated_delivery: '',
    special_instructions: '',
    packaging_notes: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load invoice data
      const invoiceData = await getInvoice(invoiceId);
      setInvoice(invoiceData);

      // Try to load existing logistics data
      try {
        const logisticsData = await getLogistics({ invoice_id: invoiceId });
        if (logisticsData.logistics && logisticsData.logistics.length > 0) {
          setLogistics(logisticsData.logistics[0]);
        }
      } catch (error) {
        // No existing logistics data, keep default
        console.log('No existing logistics data found');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load invoice data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setLogistics(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setMessage(null);

      if (logistics.id) {
        // Update existing logistics
        await updateLogistics(logistics.id, logistics);
        setMessage({ type: 'success', text: 'Logistics information updated successfully!' });
      } else {
        // Create new logistics
        const created = await createLogistics(logistics);
        setLogistics(created);
        setMessage({ type: 'success', text: 'Logistics information created successfully!' });
      }
    } catch (error) {
      console.error('Error saving logistics:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save logistics information' 
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalLogisticsCost = () => {
    return (logistics.shipping_cost || 0) + (logistics.handling_cost || 0) + (logistics.insurance_cost || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Edit Logistics</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-slate-600 mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold text-white">
            Edit Logistics - Invoice {invoice?.invoice_number || invoiceId}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Invoice Information */}
          {invoice && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Invoice Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label>Invoice Number</Label>
                    <p className="font-medium">{invoice.invoice_number}</p>
                  </div>
                  <div>
                    <Label>Client</Label>
                    <p className="font-medium">{invoice.client_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <p className="font-medium">£{(invoice.total_amount || 0).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logistics Form */}
          <Card>
            <CardHeader>
              <CardTitle>Logistics Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Shipping Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Shipping Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shipping_type">Shipping Type</Label>
                      <select
                        id="shipping_type"
                        value={logistics.shipping_type}
                        onChange={(e) => handleInputChange('shipping_type', e.target.value)}
                        className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="standard">Standard</option>
                        <option value="express">Express</option>
                        <option value="overnight">Overnight</option>
                        <option value="international">International</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="courier_service">Courier Service</Label>
                      <Input
                        id="courier_service"
                        value={logistics.courier_service}
                        onChange={(e) => handleInputChange('courier_service', e.target.value)}
                        placeholder="e.g. DHL, FedEx, Royal Mail"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="shipping_address">Address</Label>
                    <Textarea
                      id="shipping_address"
                      value={logistics.shipping_address}
                      onChange={(e) => handleInputChange('shipping_address', e.target.value)}
                      placeholder="Enter full shipping address"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="shipping_city">City</Label>
                      <Input
                        id="shipping_city"
                        value={logistics.shipping_city}
                        onChange={(e) => handleInputChange('shipping_city', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping_state">State/Province</Label>
                      <Input
                        id="shipping_state"
                        value={logistics.shipping_state}
                        onChange={(e) => handleInputChange('shipping_state', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping_postal_code">Postal Code</Label>
                      <Input
                        id="shipping_postal_code"
                        value={logistics.shipping_postal_code}
                        onChange={(e) => handleInputChange('shipping_postal_code', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping_country">Country</Label>
                      <Input
                        id="shipping_country"
                        value={logistics.shipping_country}
                        onChange={(e) => handleInputChange('shipping_country', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Costs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="shipping_cost">Shipping Cost (£)</Label>
                      <Input
                        id="shipping_cost"
                        type="number"
                        step="0.01"
                        value={logistics.shipping_cost}
                        onChange={(e) => handleInputChange('shipping_cost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="handling_cost">Handling Cost (£)</Label>
                      <Input
                        id="handling_cost"
                        type="number"
                        step="0.01"
                        value={logistics.handling_cost}
                        onChange={(e) => handleInputChange('handling_cost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="insurance_cost">Insurance Cost (£)</Label>
                      <Input
                        id="insurance_cost"
                        type="number"
                        step="0.01"
                        value={logistics.insurance_cost}
                        onChange={(e) => handleInputChange('insurance_cost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <Label>Total Logistics Cost</Label>
                    <p className="text-xl font-semibold text-teal-600">
                      £{calculateTotalLogisticsCost().toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Tracking */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Tracking & Delivery</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tracking_number">Tracking Number</Label>
                      <Input
                        id="tracking_number"
                        value={logistics.tracking_number}
                        onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimated_delivery">Estimated Delivery</Label>
                      <Input
                        id="estimated_delivery"
                        type="date"
                        value={logistics.estimated_delivery}
                        onChange={(e) => handleInputChange('estimated_delivery', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="special_instructions">Special Instructions</Label>
                      <Textarea
                        id="special_instructions"
                        value={logistics.special_instructions}
                        onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                        placeholder="Any special handling or delivery instructions"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="packaging_notes">Packaging Notes</Label>
                      <Textarea
                        id="packaging_notes"
                        value={logistics.packaging_notes}
                        onChange={(e) => handleInputChange('packaging_notes', e.target.value)}
                        placeholder="Notes about packaging requirements"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {saving ? 'Saving...' : (logistics.id ? 'Update Logistics' : 'Create Logistics')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 