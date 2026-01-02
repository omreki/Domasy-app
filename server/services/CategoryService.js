const supabase = require('../config/supabase');

const TABLE = 'categories';

class CategoryService {

    // Create a new category
    static async create(name) {
        if (!name) throw new Error('Category name is required');

        // Check for duplicate
        const { data: existing } = await supabase
            .from(TABLE)
            .select('*')
            .eq('name', name)
            .single();

        if (existing) {
            throw new Error('Category already exists');
        }

        const category = {
            name: name,
            created_at: new Date()
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(category)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // Get all categories
    static async getAll() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .order('name');

        if (error) throw new Error(error.message);
        return data;
    }

    // Delete a category
    static async delete(id) {
        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    }
}

module.exports = CategoryService;
