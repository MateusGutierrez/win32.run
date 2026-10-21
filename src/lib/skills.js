// Logos and "where did I use this" lookups for the Skills tab.

const DEVICON = 'https://cdn.jsdelivr.net/npm/devicon@2.16.0/icons';

// Lowercased skill name -> devicon path (or an XP icon when there is no good logo)
const ICONS = {
    'javascript': `${DEVICON}/javascript/javascript-original.svg`,
    'typescript': `${DEVICON}/typescript/typescript-original.svg`,
    'python': `${DEVICON}/python/python-original.svg`,
    'sql': '/images/xp/icons/ODBCDataSources.png',
    'html/css': `${DEVICON}/html5/html5-original.svg`,
    'html': `${DEVICON}/html5/html5-original.svg`,
    'css': `${DEVICON}/css3/css3-original.svg`,
    'react': `${DEVICON}/react/react-original.svg`,
    'next.js': `${DEVICON}/nextjs/nextjs-original.svg`,
    'node.js': `${DEVICON}/nodejs/nodejs-original.svg`,
    'svelte': `${DEVICON}/svelte/svelte-original.svg`,
    'vue': `${DEVICON}/vuejs/vuejs-original.svg`,
    'tailwind css': `${DEVICON}/tailwindcss/tailwindcss-original.svg`,
    'express': `${DEVICON}/express/express-original.svg`,
    'nest.js': `${DEVICON}/nestjs/nestjs-original.svg`,
    'nestjs': `${DEVICON}/nestjs/nestjs-original.svg`,
    'fastify': `${DEVICON}/fastify/fastify-original.svg`,
    'git': `${DEVICON}/git/git-original.svg`,
    'docker': `${DEVICON}/docker/docker-original.svg`,
    'aws': `${DEVICON}/amazonwebservices/amazonwebservices-original-wordmark.svg`,
    'postgresql': `${DEVICON}/postgresql/postgresql-original.svg`,
    'linux': `${DEVICON}/linux/linux-original.svg`,
    'ci/cd': `${DEVICON}/githubactions/githubactions-original.svg`,
    'supabase': `${DEVICON}/supabase/supabase-original.svg`,
    'mongo db': `${DEVICON}/mongodb/mongodb-original.svg`,
    'mongodb': `${DEVICON}/mongodb/mongodb-original.svg`
};

// Other spellings to look for in the experience text
const ALIASES = {
    'tailwind css': ['tailwind'],
    'mongo db': ['mongodb', 'mongo'],
    'html/css': ['html', 'css'],
    'nest.js': ['nestjs'],
    'node.js': ['node'],
    'next.js': ['nextjs'],
    'ci/cd': ['ci', 'cd', 'continuous integration']
};

export function skill_icon(skill) {
    if (skill.icon) return skill.icon;
    return ICONS[skill.name.toLowerCase()] || '/images/xp/icons/Properties.png';
}

function escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word match, so "Git" doesn't match "Digital" and "SQL" doesn't match "PostgreSQL"
function mentions(text, keys) {
    return keys.some(key => new RegExp(`(^|[^a-z0-9])${escape(key)}([^a-z0-9]|$)`, 'i').test(text));
}

export function jobs_using(skill_name, experience = []) {
    const name = skill_name.toLowerCase();
    const keys = [name, ...(ALIASES[name] || [])];
    return experience.filter(job => {
        const text = [job.role, job.description, ...(job.points || [])].filter(Boolean).join(' ');
        return mentions(text, keys);
    });
}

// skills in portfolio.json: { "Category": ["Name", { "name": "Name", "icon": "...", "level": "..." }] }
export function build_skill_groups(skills = {}, experience = []) {
    return Object.entries(skills).map(([category, items]) => ({
        category,
        items: items.map(item => {
            const skill = typeof item === 'string' ? { name: item } : { ...item };
            return {
                ...skill,
                category,
                icon: skill_icon(skill),
                jobs: jobs_using(skill.name, experience)
            };
        })
    }));
}
