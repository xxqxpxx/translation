import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Invoice, invoiceApi } from '../../services/invoiceApi';

interface InvoiceDetailProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onEdit: (invoice: Invoice) => void;
  onStatusUpdate: (invoiceId: string, status: Invoice['status']) => void;
}

// Mock client data - in real app, fetch from API
const getClientInfo = (clientId: string) => {
  const clients: Record<string, any> = {
    '1': { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', company: 'Acme Corp' },
    '2': { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com', company: 'Tech Solutions' },
    '3': { firstName: 'Bob', lastName: 'Johnson', email: 'bob.johnson@example.com', company: 'Global Industries' },
  };
  return clients[clientId] || { firstName: 'Unknown', lastName: 'Client', email: '', company: '' };
};

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  open,
  onClose,
  invoice,
  onEdit,
  onStatusUpdate,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);

  if (!invoice) return null;

  const client = getClientInfo(invoice.clientId);
  const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'default';
      case 'issued': return 'info';
      case 'paid': return 'success';
      case 'overdue': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getAvailableActions = () => {
    const actions = [];
    
    switch (invoice.status) {
      case 'draft':
        actions.push(
          { key: 'issue', label: 'Issue Invoice', icon: <EmailIcon /> },
          { key: 'cancel', label: 'Cancel Invoice', icon: <CancelIcon /> }
        );
        break;
      case 'issued':
        actions.push(
          { key: 'mark-paid', label: 'Mark as Paid', icon: <PaymentIcon /> },
          { key: 'mark-overdue', label: 'Mark as Overdue', icon: <CancelIcon /> },
          { key: 'cancel', label: 'Cancel Invoice', icon: <CancelIcon /> }
        );
        break;
      case 'overdue':
        actions.push(
          { key: 'mark-paid', label: 'Mark as Paid', icon: <PaymentIcon /> },
          { key: 'cancel', label: 'Cancel Invoice', icon: <CancelIcon /> }
        );
        break;
      case 'cancelled':
        actions.push(
          { key: 'restore', label: 'Restore to Draft', icon: <RestoreIcon /> }
        );
        break;
    }
    
    return actions;
  };

  const handleStatusAction = async (action: string) => {
    setAnchorEl(null);
    
    let newStatus: Invoice['status'];
    switch (action) {
      case 'issue':
        newStatus = 'issued';
        break;
      case 'mark-paid':
        newStatus = 'paid';
        break;
      case 'mark-overdue':
        newStatus = 'overdue';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        break;
      case 'restore':
        newStatus = 'draft';
        break;
      default:
        return;
    }

    try {
      setLoading(true);
      await invoiceApi.updateInvoiceStatus(invoice.id, newStatus);
      onStatusUpdate(invoice.id, newStatus);
      toast.success(`Invoice ${action.replace('-', ' ')} successfully`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setLoading(true);
      let blob: Blob;
      if (format === 'pdf') {
        blob = await invoiceApi.generateInvoicePdf(invoice.id);
      } else {
        blob = await invoiceApi.exportInvoices('csv', { page: 1, limit: 1 });
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.id.substring(0, 8)}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Invoice exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting invoice:', error);
      toast.error('Failed to export invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">
              Invoice #{invoice.id.substring(0, 8)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Created {format(new Date(invoice.createdAt), 'PPP')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={invoice.status.toUpperCase()}
              color={getStatusColor(invoice.status)}
              variant="filled"
            />
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isOverdue && invoice.status !== 'paid' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            This invoice is overdue by {invoiceApi.getDaysOverdue(invoice)} days
          </Alert>
        )}

        {/* Client Information */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Client Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Client Name</Typography>
              <Typography variant="body1">
                {client.firstName} {client.lastName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Email</Typography>
              <Typography variant="body1">{client.email}</Typography>
            </Grid>
            {client.company && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">Company</Typography>
                <Typography variant="body1">{client.company}</Typography>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Invoice Details */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Invoice Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Amount</Typography>
              <Typography variant="h6" color="primary">
                {invoiceApi.formatCurrency(invoice.amount)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Status</Typography>
              <Chip
                label={invoice.status.toUpperCase()}
                color={getStatusColor(invoice.status)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="textSecondary">Due Date</Typography>
              <Typography variant="body1">
                {format(new Date(invoice.dueDate), 'PPP')}
              </Typography>
            </Grid>
            {invoice.paidDate && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="textSecondary">Paid Date</Typography>
                <Typography variant="body1">
                  {format(new Date(invoice.paidDate), 'PPP')}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Paper>

        {/* Invoice Items */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Items
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="right">
                      {invoiceApi.formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell align="right">
                      {invoiceApi.formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="h6">Total</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" color="primary">
                      {invoiceApi.formatCurrency(invoice.amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Notes */}
        {invoice.notes && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {invoice.notes}
            </Typography>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => onEdit(invoice)}
            disabled={loading}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => handleExport('pdf')}
            disabled={loading}
          >
            Print PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
            disabled={loading}
          >
            Export CSV
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {getAvailableActions().length > 0 && (
            <>
              <Button
                variant="contained"
                endIcon={<MoreVertIcon />}
                onClick={(e) => setAnchorEl(e.currentTarget)}
                disabled={loading}
              >
                Actions
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                {getAvailableActions().map((action) => (
                  <MenuItem
                    key={action.key}
                    onClick={() => handleStatusAction(action.key)}
                  >
                    <ListItemIcon>{action.icon}</ListItemIcon>
                    <ListItemText>{action.label}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
          <Button
            onClick={onClose}
            disabled={loading}
          >
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}; 