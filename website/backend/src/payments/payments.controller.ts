import { Controller, Get, Post, Put, Param, Body, Patch, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

@Controller('admin/invoices')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async listInvoices(): Promise<Invoice[]> {
    return this.paymentsService.listInvoices();
  }

  @Get(':id')
  async getInvoice(@Param('id') id: string): Promise<Invoice> {
    const invoice = await this.paymentsService.getInvoice(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Post()
  async createInvoice(@Body() data: Partial<Invoice>): Promise<Invoice> {
    return this.paymentsService.createInvoice(data);
  }

  @Put(':id')
  async updateInvoice(@Param('id') id: string, @Body() data: Partial<Invoice>): Promise<Invoice> {
    const invoice = await this.paymentsService.updateInvoice(id, data);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body('status') status: InvoiceStatus): Promise<Invoice> {
    const invoice = await this.paymentsService.setStatus(id, status);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
} 