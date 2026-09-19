# Marionette

A lightweight procedural animation library for Minecraft Forge 1.20.1, featuring a
Blockbench plugin for authoring the rigs it animates.

Marionette builds mobs out of chains of Forge part entities, poses them
with FABRIK inverse kinematics, and syncs them visually with corresponding 
model parts, enabling easy runtime procedural animation. 

The library is paired with a Blockbench plugin, which allows for easy authoring
and exporting of rigs that can be directly copied and used in your project.


Example Marionette Entity class:
```java
public class WormEntity extends WaterAnimal implements Marionette {
    private final Limb<MarionettePart<WormEntity>> tail =
            Limb.builder(this).segments(10, 0.5f, 0.5f, 0.25f).build();

    public List<Limb<?>> getLimbs() { return List.of(tail); }

    public void tick() {
        super.tick();
        tail.animator().setFabrikTarget(someTarget);
        tickMarionette();
    }
}
```

## Documentation

Check out the [wiki](../../wiki) for all documentation: setup for both halves,
library API, and the Blockbench plugin's authoring workflow for artists.

## Building

```sh
./gradlew build                                       # Library
cd blockbench-plugin && npm install && npm run build  # Blockbench Plugin
```

Licensed under the GNU LGPL.
