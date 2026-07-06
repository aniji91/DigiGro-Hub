export function isActiveProject(project) {
  return !project?.isHidden;
}

export function filterActiveProjects(projects = []) {
  return projects.filter(isActiveProject);
}
