package net.jelly.marionette_lib.entity;

import net.jelly.marionette_lib.MarionetteMod;
import net.jelly.marionette_lib.entity.examples.octopus.OctopusEntity;
import net.jelly.marionette_lib.entity.examples.worm.WormEntity;
import net.jelly.marionette_lib.entity.examples.wyvern.WyvernEntity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public class ModEntities {
    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
            DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, MarionetteMod.MODID);

    public static final RegistryObject<EntityType<WormEntity>> WORM = ENTITY_TYPES.register("worm", () ->
            EntityType.Builder.of(WormEntity::new, MobCategory.MISC)
                    .sized(1.0f,1.0f)
                    .build("worm")
    );

    public static final RegistryObject<EntityType<OctopusEntity>> OCTOPUS = ENTITY_TYPES.register("octopus", () ->
            EntityType.Builder.of(OctopusEntity::new, MobCategory.MISC)
                    .sized(1.0f,1.0f)
                    .build("octopus")
    );

    public static final RegistryObject<EntityType<WyvernEntity>> WYVERN = ENTITY_TYPES.register("wyvern", () ->
            EntityType.Builder.of(WyvernEntity::new, MobCategory.MISC)
                    .sized(1.0f,1.0f)
                    .build("wyvern")
    );

    public static void register(IEventBus eventBus) {
        ENTITY_TYPES.register(eventBus);
    }
}
