import { Route, Switch } from 'react-router-dom';
import { ProjectsHomeRoute } from './ProjectsHome';
import { SpotifyRoute } from './spotify/SpotifyRoute';
import { NotFoundRoute } from '../NotFoundRoute';

export function ProjectsRoute() {
  return <Switch>
    <Route exact path="/projects">
      <ProjectsHomeRoute />
    </Route>
    <Route path="/projects/spotify">
      <SpotifyRoute />
    </Route>
    <Route>
      <NotFoundRoute goBackPathName="the projects page" goBackPath="/projects" />
    </Route>
  </Switch>
}