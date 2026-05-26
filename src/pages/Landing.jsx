import { Link } from 'react-router-dom';
import { ArrowRight, Shield, BarChart3, Calendar, Target, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const features = [
  { icon: BarChart3, title: '12-Month Forecast', desc: 'See exactly how much spare cash you\'ll have each month, for the next year.' },
  { icon: Calendar, title: 'Bill Calendar', desc: 'Visualise when your bills land and spot expensive weeks at a glance.' },
  { icon: Target, title: 'Savings Goals', desc: 'Set targets and track when you\'ll hit them based on your real spare money.' },
  { icon: Sparkles, title: 'What-If Mode', desc: 'Simulate income changes, new bills, or moving due dates before committing.' },
  { icon: Shield, title: 'Simple & Private', desc: 'No bank connections needed. You control your data, always.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-heading text-lg font-bold tracking-tight">
            After<span className="text-primary">Bills</span>
          </h1>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-accent rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-accent-foreground">Simple bill forecasting</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold font-heading tracking-tight text-foreground leading-tight">
              Know what's really{' '}
              <span className="text-primary">left after bills.</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
              Stop guessing. Forecast your bills, spot expensive months, and see your real spare money before payday.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link to="/register">
                <Button size="lg" className="gap-2 px-8 text-base">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Log in
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Preview Mock */}
      <section className="pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-card rounded-3xl border border-border shadow-2xl shadow-primary/5 p-6 md:p-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Remaining', value: '£1,247', color: 'text-primary' },
                { label: 'Bills this month', value: '£1,253', color: 'text-foreground' },
                { label: 'Avg spare', value: '£1,180', color: 'text-foreground' },
              ].map((stat, i) => (
                <div key={i} className="bg-muted rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-xl md:text-2xl font-bold font-heading mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-muted rounded-2xl h-40 flex items-center justify-center">
              <div className="flex items-end gap-2 h-24">
                {[60, 45, 70, 55, 80, 50, 65, 40, 75, 55, 60, 70].map((h, i) => (
                  <div
                    key={i}
                    className="w-4 md:w-6 rounded-t-md bg-primary/30"
                    style={{ height: `${h}%` }}
                  >
                    <div
                      className="w-full rounded-t-md bg-primary transition-all"
                      style={{ height: `${Math.random() * 40 + 30}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold font-heading tracking-tight">Everything you need to plan ahead</h3>
            <p className="text-muted-foreground mt-2">No complicated accounting. Just clarity.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 transition-shadow"
              >
                <div className="p-2.5 rounded-xl bg-accent w-fit mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold font-heading mb-1">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold font-heading tracking-tight">Ready to take control?</h3>
          <p className="text-muted-foreground mt-2 mb-6">Start forecasting your bills in minutes.</p>
          <Link to="/register">
            <Button size="lg" className="gap-2 px-8">
              Get Started Free <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-heading text-sm font-semibold">After<span className="text-primary">Bills</span></p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AfterBills. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}