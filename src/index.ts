import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// تفعيل CORS
app.use('/*', cors())

// إنشاء مهمة جديدة
app.post('/upload', async (c) => {
  try {
    const body = await c.req.json()
    const { image } = body
    
    if (!image) {
      return c.json({ error: 'لم يتم توفير صورة' }, 400)
    }
    
    // إنشاء معرف فريد
    const taskId = crypto.randomUUID()
    
    // حفظ في قاعدة البيانات
    await c.env.DB.prepare(
      'INSERT INTO tasks (id, original_image, status) VALUES (?, ?, ?)'
    ).bind(taskId, image, 'pending').run()
    
    return c.json({ 
      status: 'ok', 
      taskId: taskId,
      message: 'تم استلام الصورة بنجاح' 
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في معالجة الطلب' }, 500)
  }
})

// جلب المهام المعلقة
app.get('/tasks/pending', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT id, original_image FROM tasks WHERE status = ? LIMIT 10'
    ).bind('pending').all()
    
    return c.json({
      tasks: results.results || []
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب المهام' }, 500)
  }
})

// تحديث المهمة بالصورة المعالجة
app.post('/tasks/:id/respond', async (c) => {
  try {
    const taskId = c.req.param('id')
    const body = await c.req.json()
    const { processed_image } = body
    
    if (!processed_image) {
      return c.json({ error: 'لم يتم توفير الصورة المعالجة' }, 400)
    }
    
    // تحديث المهمة
    await c.env.DB.prepare(
      'UPDATE tasks SET processed_image = ?, status = ? WHERE id = ?'
    ).bind(processed_image, 'completed', taskId).run()
    
    return c.json({ 
      status: 'ok',
      message: 'تم تحديث المهمة بنجاح' 
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تحديث المهمة' }, 500)
  }
})

// جلب حالة المهمة
app.get('/tasks/:id/status', async (c) => {
  try {
    const taskId = c.req.param('id')
    
    const result = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE id = ?'
    ).bind(taskId).first()
    
    if (!result) {
      return c.json({ error: 'المهمة غير موجودة' }, 404)
    }
    
    return c.json({
      task: result
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب حالة المهمة' }, 500)
  }
})

export default app