import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import toast from 'react-hot-toast';
import { invoiceApi, Invoice, InvoiceFilters } from '../../services/invoiceApi';

interface InvoiceListProps {
  onCreateInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onCreateInvoice,
  onEditInvoice,
  onViewInvoice,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<Dayjs | null>(null);
  const [dateToFilter, setDateToFilter] = useState<Dayjs | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    issued: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  useEffect(() => {
    loadInvoices();
  }, [filters]);

  useEffect(() => {
    calculateStats();
  }, [invoices]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceApi.getInvoices(filters);
      setInvoices(response.invoices);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const newStats = invoices.reduce((acc, invoice) => {
      acc.total++;
      acc[invoice.status]++;
      acc.totalAmount += invoice.amount;
      if (invoice.status === 'paid') {
        acc.paidAmount += invoice.amount;
      }
      return acc;
    }, {
      total: 0,
      draft: 0,
      issued: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
      totalAmount: 0,
      paidAmount: 0,
    });

    setStats(newStats);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    setFilters(prev => ({ ...prev, page: newPage + 1 }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setFilters(prev => ({ ...prev, limit: newRowsPerPage, page: 1 }));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: Invoice['status']) => {
    try {
      await invoiceApi.updateInvoiceStatus(invoice.id, newStatus);
      toast.success(`Invoice status updated to ${invoiceApi.getStatusLabel(newStatus)}`);
      loadInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
    handleMenuClose();
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice #${invoice.id.substring(0, 8)}?`)) {
      try {
        await invoiceApi.deleteInvoice(invoice.id);
        toast.success('Invoice deleted successfully');
        loadInvoices();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice');
      }
    }
    handleMenuClose();
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      const blob = await invoiceApi.exportInvoices(format, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Invoices exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting invoices:', error);
      toast.error('Failed to export invoices');
    }
  };

  const handleGeneratePdf = async (invoice: Invoice) => {
    try {
      const blob = await invoiceApi.generateInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.id.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF generated');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
    handleMenuClose();
  };

  const applyFilters = () => {
    const newFilters: InvoiceFilters = {
      ...filters,
      page: 1,
      status: statusFilter ? [statusFilter] : undefined,
      dateFrom: dateFromFilter ? dateFromFilter.format('YYYY-MM-DD') : undefined,
      dateTo: dateToFilter ? dateToFilter.format('YYYY-MM-DD') : undefined,
    };
    setFilters(newFilters);
    setPage(0);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateFromFilter(null);
    setDateToFilter(null);
    setFilters({
      page: 1,
      limit: rowsPerPage,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    });
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM D, YYYY');
  };

  const getOverdueChip = (invoice: Invoice) => {
    if (invoiceApi.isOverdue(invoice)) {
      const daysOverdue = Math.abs(invoiceApi.getDaysUntilDue(invoice));
      return (
        <Chip
          label={`${daysOverdue} days overdue`}
          color="error"
          size="small"
          variant="outlined"
        />
      );
    }
    return null;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Invoice Management</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadInvoices}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateInvoice}
            >
              Create Invoice
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Invoices
                </Typography>
                <Typography variant="h5">{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Draft
                </Typography>
                <Typography variant="h5">{stats.draft}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Issued
                </Typography>
                <Typography variant="h5">{stats.issued}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Paid
                </Typography>
                <Typography variant="h5">{stats.paid}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Amount
                </Typography>
                <Typography variant="h6">{invoiceApi.formatCurrency(stats.totalAmount)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Paid Amount
                </Typography>
                <Typography variant="h6">{invoiceApi.formatCurrency(stats.paidAmount)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Filters</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="issued">Issued</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Date From"
                  value={dateFromFilter}
                  onChange={setDateFromFilter}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Date To"
                  value={dateToFilter}
                  onChange={setDateToFilter}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" onClick={applyFilters} fullWidth>
                    Apply
                  </Button>
                  <Button variant="outlined" onClick={clearFilters} fullWidth>
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Export Options */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PdfIcon />}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CsvIcon />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
        </Box>

        {/* Invoice Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice ID</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography>Loading...</Typography>
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">No invoices found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          #{invoice.id.substring(0, 8)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {invoice.client ? (
                          <Box>
                            <Typography variant="body2">
                              {invoice.client.firstName} {invoice.client.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {invoice.client.email}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Unknown Client
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {invoiceApi.formatCurrency(invoice.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Chip
                            label={invoiceApi.getStatusLabel(invoice.status)}
                            color={invoiceApi.getStatusColor(invoice.status)}
                            size="small"
                          />
                          {getOverdueChip(invoice)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(invoice.dueDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(invoice.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => onViewInvoice(invoice)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => onEditInvoice(invoice)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="More options">
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, invoice)}
                            >
                              <MoreIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => selectedInvoice && onViewInvoice(selectedInvoice)}>
            <ListItemIcon><ViewIcon /></ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => selectedInvoice && onEditInvoice(selectedInvoice)}>
            <ListItemIcon><EditIcon /></ListItemIcon>
            <ListItemText>Edit Invoice</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => selectedInvoice && handleGeneratePdf(selectedInvoice)}>
            <ListItemIcon><PdfIcon /></ListItemIcon>
            <ListItemText>Download PDF</ListItemText>
          </MenuItem>
          <Divider />
          {selectedInvoice?.status === 'draft' && (
            <MenuItem onClick={() => selectedInvoice && handleStatusChange(selectedInvoice, 'issued')}>
              <ListItemText>Mark as Issued</ListItemText>
            </MenuItem>
          )}
          {(selectedInvoice?.status === 'issued' || selectedInvoice?.status === 'overdue') && (
            <MenuItem onClick={() => selectedInvoice && handleStatusChange(selectedInvoice, 'paid')}>
              <ListItemText>Mark as Paid</ListItemText>
            </MenuItem>
          )}
          {selectedInvoice?.status !== 'paid' && selectedInvoice?.status !== 'cancelled' && (
            <MenuItem onClick={() => selectedInvoice && handleStatusChange(selectedInvoice, 'cancelled')}>
              <ListItemText>Cancel Invoice</ListItemText>
            </MenuItem>
          )}
          <Divider />
          <MenuItem 
            onClick={() => selectedInvoice && handleDeleteInvoice(selectedInvoice)}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
            <ListItemText>Delete Invoice</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </LocalizationProvider>
  );
}; 