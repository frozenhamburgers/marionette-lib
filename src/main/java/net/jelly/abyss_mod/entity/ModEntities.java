package net.jelly.abyss_mod.entity;

import net.jelly.abyss_mod.AbyssMod;
import net.jelly.abyss_mod.entity.IK.worm.WormController;
import net.jelly.abyss_mod.entity.IK.worm.WormSegment;
import net.jelly.abyss_mod.entity.multipart.WormEntity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public class ModEntities {
    public static final DeferredRegister<EntityType<?>> ENTITY_TYPES =
            DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, AbyssMod.MODID);

    public static final RegistryObject<EntityType<WormSegment>> WORM_SEGMENT = ENTITY_TYPES.register("worm_segment", () ->
            EntityType.Builder.of(WormSegment::new, MobCategory.MISC)
                    .sized(1f,1f)
                    .clientTrackingRange(400)
                    .build("worm_segment")
    );
    public static final RegistryObject<EntityType<WormController>> WORM_CONTROLLER = ENTITY_TYPES.register("worm_controller", () ->
            EntityType.Builder.of(WormController::new, MobCategory.MISC)
                    .sized(0.5f,0.5f)
                    .build("worm_chain")
    );
    public static final RegistryObject<EntityType<WormEntity>> WORM = ENTITY_TYPES.register("worm", () ->
            EntityType.Builder.of(WormEntity::new, MobCategory.MISC)
                    .sized(0.5f,0.5f)
                    .build("worm")
    );

    public static void register(IEventBus eventBus) {
        ENTITY_TYPES.register(eventBus);
    }
}
