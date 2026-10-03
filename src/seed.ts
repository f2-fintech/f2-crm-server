import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead } from './modules/leads/schemas/lead.schema';
import { Customer } from './modules/customers/schemas/customer.schema';
import { Application } from './modules/applications/schemas/application.schema';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const leadModel = app.get<Model<Lead>>(getModelToken(Lead.name));
  const customerModel = app.get<Model<Customer>>(getModelToken(Customer.name));
  const applicationModel = app.get<Model<Application>>(getModelToken(Application.name));

  console.log('🌱 Seeding database...');

  // Clear existing data
  await leadModel.deleteMany({});
  await customerModel.deleteMany({});
  await applicationModel.deleteMany({});
  console.log('🧹 Cleared old data.');

  // Seed Leads
  const leadsData = [
    {
      leadId: 'LD-001',
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+919876543210',
      status: 'NEW',
      leadSource: 'Website',
      assignedTo: null,
      kycStatus: 'PENDING',
      monthlyIncome: 85000,
    },
    {
      leadId: 'LD-002',
      fullName: 'Priya Singh',
      email: 'priya.singh@example.com',
      phone: '+919876543211',
      status: 'CONTACTED',
      leadSource: 'Referral',
      assignedTo: null,
      kycStatus: 'VERIFIED',
      monthlyIncome: 120000,
    }
  ];

  const createdLeads = await leadModel.insertMany(leadsData);
  console.log(`✅ Seeded ${createdLeads.length} Leads.`);

  // Seed Customers
  const customerData = [
    {
      customerId: 'CUST-001',
      fullName: 'Amit Patel',
      email: 'amit.patel@example.com',
      phone: '+919876543212',
      status: 'ACTIVE',
      source: 'Organic',
      kycStatus: 'VERIFIED',
    },
    {
      customerId: 'CUST-002',
      fullName: 'Neha Gupta',
      email: 'neha.gupta@example.com',
      phone: '+919876543213',
      status: 'INACTIVE',
      source: 'Agent',
      kycStatus: 'VERIFIED',
    }
  ];

  const createdCustomers = await customerModel.insertMany(customerData);
  console.log(`✅ Seeded ${createdCustomers.length} Customers.`);

  // Seed Applications
  const appsData = [
    {
      applicationId: 'APP-1001',
      applicantName: 'Amit Patel',
      phone: '+919876543212',
      customerId: createdCustomers[0]._id,
      loanType: 'Home Loan',
      loanAmount: 5000000,
      status: 'UNDER_REVIEW',
    },
    {
      applicationId: 'APP-1002',
      applicantName: 'Neha Gupta',
      phone: '+919876543213',
      customerId: createdCustomers[1]._id,
      loanType: 'Personal Loan',
      loanAmount: 200000,
      status: 'APPROVED',
    }
  ];

  const createdApps = await applicationModel.insertMany(appsData);
  console.log(`✅ Seeded ${createdApps.length} Applications.`);

  console.log('🎉 Seeding complete!');
  await app.close();
}

bootstrap();
