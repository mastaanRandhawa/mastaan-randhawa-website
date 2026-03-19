import { useState, FormEvent } from "react";
import { Mail, Linkedin, Github, Send, CheckCircle } from "lucide-react";

const contactMethods = [
  {
    icon: Mail,
    label: "Email",
    value: "mastaanrandhawa@gmail.com",
    href: "mailto:mastaanrandhawa@gmail.com",
    color: "#ff5941",
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "Connect professionally",
    href: "https://linkedin.com/in/MastaanRandhawa",
    color: "#0015ff",
  },
  {
    icon: Github,
    label: "GitHub",
    value: "Check out my repositories",
    href: "https://github.com/mastaanRandhawa",
    color: "#1f464d",
  },
];

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { name, email, subject, message } = form;
    const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    window.location.href = `mailto:mastaanrandhawa@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
    setForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <section id="contact" className="py-24 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            Contact
          </span>
          <h2 className="font-serif italic text-4xl sm:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            Get In Touch
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl">
            Have a project in mind or want to collaborate? I'd love to hear from you!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Contact info */}
          <div>
            <h3 className="font-mono font-semibold text-zinc-900 dark:text-white mb-2">
              Let's Connect
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
              I'm always interested in new opportunities and exciting projects. Whether you have a
              question, want to collaborate, or just want to say hi — feel free to reach out!
            </p>

            <div className="flex flex-col gap-4">
              {contactMethods.map(({ icon: Icon, label, value, href, color }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-200 group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color + "18" }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-white group-hover:text-accent-blue transition-colors">
                      {label}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{value}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-zinc-500 dark:text-zinc-400">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue dark:focus:border-accent-blue transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs text-zinc-500 dark:text-zinc-400">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue dark:focus:border-accent-blue transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-zinc-500 dark:text-zinc-400">Subject</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Project inquiry"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue dark:focus:border-accent-blue transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-zinc-500 dark:text-zinc-400">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Hi Mastaan, I'd love to discuss..."
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-mono placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-accent-blue dark:focus:border-accent-blue transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className={`inline-flex items-center justify-center gap-2 font-mono text-sm px-6 py-3 rounded-xl transition-all duration-200 ${
                sent
                  ? "bg-green-500 text-white"
                  : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-accent-blue dark:hover:bg-accent-blue dark:hover:text-white"
              }`}
            >
              {sent ? (
                <>
                  <CheckCircle size={16} /> Message Sent!
                </>
              ) : (
                <>
                  <Send size={16} /> Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
