// Initialize default user preferences
import { db } from './db';

async function initPreferences() {
	try {
		console.log('Checking for default preferences...');

		const existing = await db.userPreferences.findUnique({
			where: { id: 'default' }
		});

		if (existing) {
			console.log('✅ Default preferences already exist');
			console.log(existing);
		} else {
			console.log('Creating default preferences...');
			const created = await db.userPreferences.create({
				data: {
					id: 'default',
					interests: '{}',
					sourceWeights: '{}',
					moodBalance: 0,
					preferLongForm: false,
					preferVisual: true
				}
			});
			console.log('✅ Default preferences created successfully');
			console.log(created);
		}
	} catch (error) {
		console.error('❌ Error initializing preferences:', error);
		throw error;
	} finally {
		await db.$disconnect();
	}
}

initPreferences();
