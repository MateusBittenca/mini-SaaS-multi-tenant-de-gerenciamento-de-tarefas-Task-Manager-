import 'dotenv/config';
import { createApp } from './app';
import { startDueSoonJob } from './jobs/dueSoon.job';

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startDueSoonJob();
});
