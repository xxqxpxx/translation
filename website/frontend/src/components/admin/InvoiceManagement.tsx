import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Assessment as AssessmentIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Invoice, invoiceApi } from '../../services/invoiceApi';
import { InvoiceList } from './InvoiceList';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceDetail } from './InvoiceDetail';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`invoice-tabpanel-${index}`}
      aria-labelledby={`invoice-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const InvoiceManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Load invoices on component mount and refresh trigger
  useEffect(() => {
    loadInvoices();
  }, [refreshTrigger]);

  // Handle URL navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab === 'analytics') {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [location.search]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceApi.getInvoices({
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });
      setInvoices(response.invoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const searchParams = new URLSearchParams();
    if (newValue === 1) {
      searchParams.set('tab', 'analytics');
    }
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailOpen(true);
  };

  const handleFormSave = (savedInvoice: Invoice) => {
    // Update local state
    if (formMode === 'create') {
      setInvoices(prev => [savedInvoice, ...prev]);
    } else {
      setInvoices(prev => prev.map(inv => 
        inv.id === savedInvoice.id ? savedInvoice : inv
      ));
    }
    
    // Refresh data to ensure consistency
    setRefreshTrigger(prev => prev + 1);
  };

  const handleStatusUpdate = (invoiceId: string, newStatus: Invoice['status']) => {
    // Update local state immediately for better UX
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId ? { ...inv, status: newStatus } : inv
    ));
    
    // Update selected invoice if it's the one being viewed
    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice(prev => prev ? { ...prev, status: newStatus } : null);
    }
    
    // Refresh data to ensure consistency
    setRefreshTrigger(prev => prev + 1);
  };

  const handleInvoiceDeleted = (invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    
    // Close detail modal if the deleted invoice was being viewed
    if (selectedInvoice?.id === invoiceId) {
      setDetailOpen(false);
      setSelectedInvoice(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          color="inherit" 
          href="/admin" 
          onClick={(e) => {
            e.preventDefault();
            navigate('/admin');
          }}
        >
          Admin
        </Link>
        <Typography color="text.primary">Invoice Management</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Invoice Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateInvoice}
          size="large"
        >
          Create Invoice
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="invoice management tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<ReceiptIcon />}
            label="Invoices"
            id="invoice-tab-0"
            aria-controls="invoice-tabpanel-0"
          />
          <Tab
            icon={<AssessmentIcon />}
            label="Analytics"
            id="invoice-tab-1"
            aria-controls="invoice-tabpanel-1"
            disabled
          />
        </Tabs>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <InvoiceList
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onStatusUpdate={handleStatusUpdate}
            onInvoiceDeleted={handleInvoiceDeleted}
            refreshTrigger={refreshTrigger}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Coming soon - Invoice analytics and reporting features
            </Typography>
          </Box>
        </TabPanel>
      </Paper>

      {/* Modals */}
      <InvoiceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleFormSave}
        invoice={selectedInvoice}
        mode={formMode}
      />

      <InvoiceDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        invoice={selectedInvoice}
        onEdit={handleEditInvoice}
        onStatusUpdate={handleStatusUpdate}
      />
    </Box>
  );
}; 