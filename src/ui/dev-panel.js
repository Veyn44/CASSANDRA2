import { generateAsteroidForState } from '../world/asteroid-cluster-generator.js';
export function bindDevPanel(state, refresh, note) {
  const panel = document.querySelector('#ast-gen-panel'),
    result = document.querySelector('#ast-gen-result');
  const value = (id) => Number(document.querySelector(id).value);
  const collectParams = () => ({
    seed: value('#ast-seed'),
    width: value('#ast-size-x'),
    height: value('#ast-size-y'),
    bodyCount: value('#ast-body-count'),
    cavitySizePercent: value('#ast-cavity-size'),
    cavityCount: value('#ast-cavity-count'),
  });
  const validParams = (params) =>
    Number.isInteger(params.seed) &&
    params.seed >= 1 &&
    params.seed <= 2000 &&
    params.width >= 3 &&
    params.width <= 120 &&
    params.height >= 3 &&
    params.height <= 100 &&
    params.bodyCount >= 1 &&
    params.bodyCount <= 8 &&
    Number.isFinite(params.cavitySizePercent) &&
    params.cavitySizePercent >= 0 &&
    params.cavitySizePercent <= 30 &&
    params.cavityCount >= 0 &&
    params.cavityCount <= 20;
  document.querySelector('#generate-asteroid').onclick = () => {
    const params = collectParams();
    if (!validParams(params)) {
      result.textContent = 'INVALID GENERATOR PARAMETERS';
      return;
    }
    try {
      const body = generateAsteroidForState(state, params);
      if (
        !body ||
        !Array.isArray(body.cells) ||
        !body.cells.length ||
        !Array.isArray(body.solidCells) ||
        !body.solidCells.length ||
        !Array.isArray(body.bodies) ||
        body.bodies.length !== params.bodyCount ||
        !body.majorBody ||
        !Number.isFinite(body.generationArea?.radius)
      )
        throw new Error('INCOMPLETE ASTEROID CLUSTER');
      result.textContent =
        'GENERATED · ATTEMPTS: 1 · SEED: ' +
        params.seed +
        ' · ' +
        body.occupiedTileCount +
        ' ROCK TILES · ' +
        body.cavityTileCount +
        ' CAVITY GROUND · ' +
        body.bodyCount +
        ' BODIES · RADIUS ' +
        body.generationArea.radius;
      note(
        'ASTEROID CLUSTER GENERATED · MAJOR ' +
          body.majorBody.solidCells.length +
          ' ROCK TILES · ' +
          (body.bodyCount - 1) +
          ' MINOR BODIES'
      );
      refresh();
    } catch (error) {
      result.textContent = 'GENERATION FAILED · ATTEMPTS: 1 · ' + error.message;
      note('ASTEROID GENERATION FAILED');
    }
  };
  document.querySelector('#generate-next-asteroid').onclick = () => {
    let lastError = 'NO VALID RESULT';
    for (let attempt = 1; attempt <= 50; attempt++) {
      const params = {
        seed: 1 + Math.floor(Math.random() * 2000),
        width: 30 + Math.floor(Math.random() * 71),
        height: 30 + Math.floor(Math.random() * 71),
        bodyCount: 1 + Math.floor(Math.random() * 6),
        cavitySizePercent: 10 + Math.floor(Math.random() * 21),
        cavityCount: 1 + Math.floor(Math.random() * 15),
      };
      try {
        const body = generateAsteroidForState(state, params);
        if (
          !body ||
          !Array.isArray(body.cells) ||
          !body.cells.length ||
          !Array.isArray(body.solidCells) ||
          !body.solidCells.length ||
          !Array.isArray(body.bodies) ||
          body.bodies.length !== params.bodyCount ||
          !body.majorBody ||
          !Number.isFinite(body.generationArea?.radius)
        )
          throw new Error('INCOMPLETE ASTEROID CLUSTER');
        document.querySelector('#ast-seed').value = String(params.seed);
        document.querySelector('#ast-size-x').value = String(params.width);
        document.querySelector('#ast-size-y').value = String(params.height);
        document.querySelector('#ast-body-count').value = String(params.bodyCount);
        document.querySelector('#ast-cavity-size').value = String(params.cavitySizePercent);
        document.querySelector('#ast-cavity-count').value = String(params.cavityCount);
        result.textContent =
          'GENERATED · ATTEMPTS: ' +
          attempt +
          ' · SEED: ' +
          params.seed +
          ' · SIZE: ' +
          params.width +
          ' × ' +
          params.height +
          ' · BODIES: ' +
          params.bodyCount +
          ' · CAVITY: ' +
          params.cavitySizePercent +
          '% / ' +
          params.cavityCount +
          ' GROUPS';
        note('ASTEROID CLUSTER GENERATED · ' + attempt + ' ATTEMPTS · SEED ' + params.seed);
        refresh();
        return;
      } catch (error) {
        lastError = error?.message || 'GENERATION FAILED';
      }
    }
    result.textContent = 'GEN NEXT FAILED · ATTEMPTS: 50 · ' + lastError;
    note('ASTEROID GENERATION FAILED AFTER 50 ATTEMPTS');
  };
  return {
    open() {
      panel.hidden = false;
    },
    close() {
      panel.hidden = true;
    },
  };
}
