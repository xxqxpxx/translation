import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Alert,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import toast from 'react-hot-toast';
import { Invoice, InvoiceItem, CreateInvoiceRequest, UpdateInvoiceRequest, invoiceApi } from '../../services/invoiceApi';

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
  invoice?: Invoice | null;
  mode: 'create' | 'edit';
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Mock clients - in real app, fetch from API
const mockClients: Client[] = [
  { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
  { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' },
  { id: '3', firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@example.com' },
];

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  open,
  onClose,
  onSave,
  invoice,
  mode,
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [status, setStatus] = useState<Invoice['status']>('draft');
  const [dueDate, setDueDate] = useState<Dayjs | null>(dayjs().add(30, 'days'));
  const [paidDate, setPaidDate] = useState<Dayjs | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  // Initialize form when invoice changes
  useEffect(() => {
    if (invoice && mode === 'edit') {
      const client = mockClients.find(c => c.id === invoice.clientId);
      setSelectedClient(client || null);
      setStatus(invoice.status);
      setDueDate(dayjs(invoice.dueDate));
      setPaidDate(invoice.paidDate ? dayjs(invoice.paidDate) : null);
      setNotes(invoice.notes || '');
      setItems(invoice.items.length > 0 ? invoice.items : [
        { description: '', quantity: 1, unitPrice: 0, total: 0 }
      ]);
    } else {
      resetForm();
    }
  }, [invoice, mode]);

  const resetForm = () => {
    setSelectedClient(null);
    setStatus('draft');
    setDueDate(dayjs().add(30, 'days'));
    setPaidDate(null);
    setNotes('');
    setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    setErrors({});
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total for this item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.total, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedClient) {
      newErrors.client = 'Client is required';
    }

    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    // Validate items
    items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item-${index}-description`] = 'Description is required';
      }
      if (item.quantity <= 0) {
        newErrors[`item-${index}-quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        newErrors[`item-${index}-unitPrice`] = 'Unit price cannot be negative';
      }
    });

    if (calculateTotal() <= 0) {
      newErrors.total = 'Invoice total must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors before saving');
      return;
    }

    try {
      setLoading(true);
      
      const invoiceData = {
        clientId: selectedClient!.id,
        amount: calculateTotal(),
        status,
        dueDate: dueDate!.format('YYYY-MM-DD'),
        ...(paidDate && { paidDate: paidDate.format('YYYY-MM-DD') }),
        items: items.filter(item => item.description.trim()),
        notes: notes.trim() || undefined,
      };

      let savedInvoice: Invoice;

      if (mode === 'create') {
        savedInvoice = await invoiceApi.createInvoice(invoiceData as CreateInvoiceRequest);
        toast.success('Invoice created successfully');
      } else {
        savedInvoice = await invoiceApi.updateInvoice(invoice!.id, invoiceData as UpdateInvoiceRequest);
        toast.success('Invoice updated successfully');
      }

      onSave(savedInvoice);
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          {mode === 'create' ? 'Create New Invoice' : 'Edit Invoice'}
          {invoice && mode === 'edit' && (
            <Typography variant="body2" color="textSecondary">
              Invoice #{invoice.id.substring(0, 8)}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Client and Basic Info */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={mockClients}
                  getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.email})`}
                  value={selectedClient}
                  onChange={(_, newValue) => setSelectedClient(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Client"
                      required
                      error={!!errors.client}
                      helperText={errors.client}
                      fullWidth
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => setStatus(e.target.value as Invoice['status'])}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="issued">Issued</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Due Date"
                  value={dueDate}
                  onChange={setDueDate}
                  slotProps={{
                    textField: {
                      required: true,
                      error: !!errors.dueDate,
                      helperText: errors.dueDate,
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Paid Date"
                  value={paidDate}
                  onChange={setPaidDate}
                  disabled={status !== 'paid'}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: status !== 'paid' ? 'Only available for paid invoices' : '',
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Invoice Items */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Invoice Items</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addItem}
                  size="small"
                >
                  Add Item
                </Button>
              </Box>

              {errors.items && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.items}
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell width="120px">Quantity</TableCell>
                      <TableCell width="120px">Unit Price</TableCell>
                      <TableCell width="120px">Total</TableCell>
                      <TableCell width="60px">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Service description"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            error={!!errors[`item-${index}-description`]}
                            helperText={errors[`item-${index}-description`]}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            error={!!errors[`item-${index}-quantity`]}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            error={!!errors[`item-${index}-unitPrice`]}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {invoiceApi.formatCurrency(item.total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6">
                    Total: {invoiceApi.formatCurrency(calculateTotal())}
                  </Typography>
                  {errors.total && (
                    <Typography variant="caption" color="error">
                      {errors.total}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Notes */}
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or comments..."
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
            startIcon={<SaveIcon />}
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}; 