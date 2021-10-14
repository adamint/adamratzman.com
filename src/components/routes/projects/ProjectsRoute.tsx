import { Route, Switch } from 'react-router-dom';
import { ProjectsHomeRoute } from './ProjectsHome';
import { SpotifyRoute } from './spotify/SpotifyRoute';
import { NotFoundRoute } from '../NotFoundRoute';
import { BaseConverterRoute } from './utilities/BaseConverterRoute';
import { ArbitraryPrecisionCalculatorRoute } from './utilities/ArbitraryPrecisionCalculatorRoute';
import { CharacterCounterRoute } from './utilities/CharacterCounterRoute';

export function ProjectsRoute() {
  return <Switch>
    <Route exact path='/projects'>
      <ProjectsHomeRoute />
    </Route>
    <Route exact path='/projects/character-counter'>
      <CharacterCounterRoute />
    </Route>
    <Route exact path='/projects/calculator'>
      <ArbitraryPrecisionCalculatorRoute />
    </Route>
    <Route exact path='/projects/conversion/base-converter'>
      <BaseConverterRoute />
    </Route>
    <Route path='/projects/spotify'>
      <SpotifyRoute />
    </Route>
    <Route>
      <NotFoundRoute goBackPathName='the projects page' goBackPath='/projects' />
    </Route>
  </Switch>;
}