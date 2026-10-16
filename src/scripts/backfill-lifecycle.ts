import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { parseArgs } from 'util';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/f2_crm';

const args = parseArgs({
  options: {
    'dry-run': {
      type: 'boolean',
      default: false,
    },
  },
});

const isDryRun = args.values['dry-run'];

const LeadSchema = new mongoose.Schema({ status: String, createdAt: Date }, { strict: false });
const ApplicationSchema = new mongoose.Schema({ status: String, createdAt: Date, leadId: String, customerId: String }, { strict: false });
const CustomerSchema = new mongoose.Schema({ status: String, createdAt: Date, leadId: String, applicationId: String }, { strict: false });
const StageHistorySchema = new mongoose.Schema({
  entityType: String,
  entityId: String,
  leadId: String,
  customerId: String,
  applicationId: String,
  stage: String,
  enteredAt: Date,
  exitedAt: Date,
  durationSeconds: Number,
  source: String,
}, { strict: false, timestamps: true });

const LeadModel = mongoose.model('Lead', LeadSchema, 'leads');
const ApplicationModel = mongoose.model('Application', ApplicationSchema, 'applications');
const CustomerModel = mongoose.model('Customer', CustomerSchema, 'customers');
const StageHistoryModel = mongoose.model('StageHistory', StageHistorySchema, 'stagehistories');

async function backfill() {
  console.log(`Starting Lifecycle Backfill... (Dry Run: ${isDryRun})`);
  
  await mongoose.connect(MONGO_URI);

  let stats = {
    leads: 0,
    applications: 0,
    customers: 0,
    createdStageHistory: 0,
    skippedExisting: 0,
    failed: 0,
  };

  // Backfill Leads
  const leads = await LeadModel.find({ isDeleted: false });
  stats.leads = leads.length;
  for (const lead of leads) {
    try {
      const existing = await StageHistoryModel.findOne({ entityType: 'Lead', entityId: lead._id.toString() });
      if (existing) {
        stats.skippedExisting++;
        continue;
      }

      if (!isDryRun) {
        await StageHistoryModel.create({
          entityType: 'Lead',
          entityId: lead._id.toString(),
          leadId: lead._id.toString(),
          stage: lead.get('status') || 'NEW',
          enteredAt: lead.get('createdAt') || new Date(),
          exitedAt: null,
          durationSeconds: null,
          source: 'BACKFILL',
        });
      }
      stats.createdStageHistory++;
    } catch (e) {
      console.error(`Error backfilling Lead ${lead._id}:`, e);
      stats.failed++;
    }
  }

  // Backfill Applications
  const applications = await ApplicationModel.find({ isDeleted: false });
  stats.applications = applications.length;
  for (const app of applications) {
    try {
      const existing = await StageHistoryModel.findOne({ entityType: 'Application', entityId: app._id.toString() });
      if (existing) {
        stats.skippedExisting++;
        continue;
      }

      if (!isDryRun) {
        await StageHistoryModel.create({
          entityType: 'Application',
          entityId: app._id.toString(),
          applicationId: app._id.toString(),
          leadId: app.get('leadId'),
          customerId: app.get('customerId'),
          stage: app.get('status') || 'DRAFT',
          enteredAt: app.get('createdAt') || new Date(),
          exitedAt: null,
          durationSeconds: null,
          source: 'BACKFILL',
        });
      }
      stats.createdStageHistory++;
    } catch (e) {
      console.error(`Error backfilling Application ${app._id}:`, e);
      stats.failed++;
    }
  }

  // Backfill Customers
  const customers = await CustomerModel.find({ isDeleted: false });
  stats.customers = customers.length;
  for (const customer of customers) {
    try {
      const existing = await StageHistoryModel.findOne({ entityType: 'Customer', entityId: customer._id.toString() });
      if (existing) {
        stats.skippedExisting++;
        continue;
      }

      if (!isDryRun) {
        await StageHistoryModel.create({
          entityType: 'Customer',
          entityId: customer._id.toString(),
          customerId: customer._id.toString(),
          leadId: customer.get('leadId'),
          applicationId: customer.get('applicationId'),
          stage: customer.get('status') || 'ACTIVE',
          enteredAt: customer.get('createdAt') || new Date(),
          exitedAt: null,
          durationSeconds: null,
          source: 'BACKFILL',
        });
      }
      stats.createdStageHistory++;
    } catch (e) {
      console.error(`Error backfilling Customer ${customer._id}:`, e);
      stats.failed++;
    }
  }

  console.log('\nLifecycle Backfill');
  console.log('------------------');
  console.log(`Leads: ${stats.leads}`);
  console.log(`Applications: ${stats.applications}`);
  console.log(`Customers: ${stats.customers}\n`);
  console.log(`Created StageHistory: ${stats.createdStageHistory}`);
  console.log(`Skipped Existing: ${stats.skippedExisting}`);
  console.log(`Failed: ${stats.failed}`);

  await mongoose.disconnect();
}

backfill().catch(console.error);
