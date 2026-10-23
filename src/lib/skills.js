// Logos for the Skills tab.

const DEVICON = 'https://cdn.jsdelivr.net/npm/devicon@2.16.0/icons';

// Lowercased skill name -> devicon path (or an XP icon when there is no good logo)
const ICONS = {
    'javascript': `${DEVICON}/javascript/javascript-original.svg`,
    'typescript': `${DEVICON}/typescript/typescript-original.svg`,
    'python': `${DEVICON}/python/python-original.svg`,
    'java': `${DEVICON}/java/java-original.svg`,
    'sql': '/images/xp/icons/ODBCDataSources.png',
    'html/css': `${DEVICON}/html5/html5-original.svg`,
    'html': `${DEVICON}/html5/html5-original.svg`,
    'css': `${DEVICON}/css3/css3-original.svg`,
    'react': `${DEVICON}/react/react-original.svg`,
    'angular': `${DEVICON}/angular/angular-original.svg`,
    'angularjs': `${DEVICON}/angularjs/angularjs-original.svg`,
    'spring': `${DEVICON}/spring/spring-original.svg`,
    'spring boot': `${DEVICON}/spring/spring-original.svg`,
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

export function skill_icon(skill) {
    if (skill.icon) return skill.icon;
    return ICONS[skill.name.toLowerCase()] || '/images/xp/icons/Properties.png';
}

function to_skill(item) {
    const skill = typeof item === 'string' ? { name: item } : { ...item };
    return { ...skill, icon: skill_icon(skill) };
}

// skills in portfolio.json: { "Category": ["Name", { "name": "Name", "icon": "..." }] }
export function build_skill_groups(skills = {}) {
    return Object.entries(skills).map(([category, items]) => ({
        category,
        items: items.map(to_skill)
    }));
}

// core_stack in portfolio.json: ["Name", { "name": "Name", "icon": "..." }]
export function build_core_stack(core_stack = []) {
    return core_stack.map(to_skill);
}
