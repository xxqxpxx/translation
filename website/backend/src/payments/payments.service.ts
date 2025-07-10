import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const invoice = this.invoiceRepository.create(data);
    return this.invoiceRepository.save(invoice);
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | null> {
    await this.invoiceRepository.update(id, data);
    return this.invoiceRepository.findOneBy({ id });
  }

  async listInvoices(): Promise<Invoice[]> {
    return this.invoiceRepository.find({ order: { createdAt: 'DESC' } });
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOneBy({ id });
  }

  async setStatus(id: string, status: InvoiceStatus): Promise<Invoice | null> {
    await this.invoiceRepository.update(id, { status });
    return this.invoiceRepository.findOneBy({ id });
  }
} 